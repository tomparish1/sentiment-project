import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import { embeddingEngine, cosineSimilarity } from '../embedding-engine/index.js';
import {
  ExemplarStoreInputSchema,
  type ExemplarStoreInput,
  type ExemplarStoreOutput,
  type Exemplar,
  type ExemplarMatch,
  type ExemplarStoreStats,
} from './schema.js';

// In-memory store cache (keyed by file path)
const storeCache: Map<string, Exemplar[]> = new Map();

async function loadFromFile(storePath: string): Promise<Exemplar[]> {
  try {
    const content = await readFile(storePath, 'utf-8');
    const data = JSON.parse(content);
    const exemplars = data.exemplars || [];
    storeCache.set(storePath, exemplars);
    return exemplars;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, return empty array
      storeCache.set(storePath, []);
      return [];
    }
    throw error;
  }
}

async function saveToFile(storePath: string, exemplars: Exemplar[]): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });

  const data = {
    version: '1.0',
    savedAt: new Date().toISOString(),
    exemplarCount: exemplars.length,
    moveTypeCounts: countBy(exemplars, 'moveType'),
    exemplars,
  };

  await writeFile(storePath, JSON.stringify(data, null, 2));
  storeCache.set(storePath, exemplars);
}

function getExemplars(storePath: string): Exemplar[] {
  return storeCache.get(storePath) || [];
}

function countBy(exemplars: Exemplar[], field: keyof Exemplar): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of exemplars) {
    const value = String(e[field] || 'unknown');
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

async function computeEmbedding(text: string): Promise<number[] | undefined> {
  const result = await embeddingEngine.invoke({ texts: [text], model: 'Xenova/all-MiniLM-L6-v2', normalize: true });
  if (result.success && result.data) {
    return result.data.embeddings[0];
  }
  return undefined;
}

async function ensureEmbeddings(exemplars: Exemplar[]): Promise<Exemplar[]> {
  const needsEmbedding = exemplars.filter((e) => !e.embedding);
  if (needsEmbedding.length === 0) return exemplars;

  const texts = needsEmbedding.map((e) => e.text);
  const result = await embeddingEngine.invoke({ texts, model: 'Xenova/all-MiniLM-L6-v2', normalize: true });

  if (result.success && result.data) {
    let idx = 0;
    for (const exemplar of exemplars) {
      if (!exemplar.embedding) {
        exemplar.embedding = result.data.embeddings[idx];
        exemplar.embeddingModel = result.data.model;
        idx++;
      }
    }
  }

  return exemplars;
}

export const exemplarStore: Skill<ExemplarStoreInput, ExemplarStoreOutput> = {
  metadata: {
    name: 'exemplar-store',
    version: '1.0.0',
    description: 'Manage collections of rhetorical move exemplars',
    category: 'storage',
    dependencies: ['embedding-engine'],
  },

  validate(input: ExemplarStoreInput) {
    const result = ExemplarStoreInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    // Operation-specific validation
    const { operation, storePath, exemplar, exemplarId, text } = input;

    if (['load', 'save', 'add', 'search', 'list'].includes(operation) && !storePath) {
      return { valid: false, errors: ['storePath is required for this operation'] };
    }

    if (operation === 'add' && !exemplar) {
      return { valid: false, errors: ['exemplar is required for add operation'] };
    }

    if (operation === 'remove' && !exemplarId) {
      return { valid: false, errors: ['exemplarId is required for remove operation'] };
    }

    if (operation === 'search' && !text) {
      return { valid: false, errors: ['text is required for search operation'] };
    }

    return { valid: true };
  },

  async invoke(input: ExemplarStoreInput): Promise<SkillResult<ExemplarStoreOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<ExemplarStoreOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const { operation, storePath, topK = 5, threshold = 0, moveType } = input;

      switch (operation) {
        case 'load': {
          const exemplars = await loadFromFile(storePath!);
          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            exemplars,
            message: `Loaded ${exemplars.length} exemplars`,
          });
        }

        case 'save': {
          const exemplars = getExemplars(storePath!);
          await saveToFile(storePath!, exemplars);
          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            message: `Saved ${exemplars.length} exemplars`,
          });
        }

        case 'add': {
          const { exemplar: newExemplarData } = input;
          let exemplars = storeCache.get(storePath!) || [];

          // Create new exemplar with ID and timestamp
          const newExemplar: Exemplar = {
            id: randomUUID(),
            ...newExemplarData!,
            confidence: newExemplarData!.confidence || 'high',
            annotatedDate: new Date().toISOString().split('T')[0],
          };

          // Compute embedding
          const embedding = await computeEmbedding(newExemplar.text);
          if (embedding) {
            newExemplar.embedding = embedding;
            newExemplar.embeddingModel = 'Xenova/all-MiniLM-L6-v2';
          }

          exemplars = [...exemplars, newExemplar];
          storeCache.set(storePath!, exemplars);

          // Auto-save
          await saveToFile(storePath!, exemplars);

          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            addedExemplar: newExemplar,
            message: `Added exemplar ${newExemplar.id}`,
          });
        }

        case 'remove': {
          const { exemplarId } = input;
          let exemplars = getExemplars(storePath!);
          const before = exemplars.length;
          exemplars = exemplars.filter((e) => e.id !== exemplarId);

          if (exemplars.length === before) {
            return createSkillResult(name, version, startTime, {
              operation,
              success: false,
              message: `Exemplar ${exemplarId} not found`,
            });
          }

          storeCache.set(storePath!, exemplars);
          await saveToFile(storePath!, exemplars);

          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            removedId: exemplarId,
            message: `Removed exemplar ${exemplarId}`,
          });
        }

        case 'search': {
          const { text: queryText } = input;
          let exemplars = getExemplars(storePath!);

          // Filter by move type if specified
          if (moveType) {
            exemplars = exemplars.filter((e) => e.moveType === moveType);
          }

          if (exemplars.length === 0) {
            return createSkillResult(name, version, startTime, {
              operation,
              success: true,
              matches: [],
              message: 'No exemplars to search',
            });
          }

          // Ensure all exemplars have embeddings
          exemplars = await ensureEmbeddings(exemplars);
          storeCache.set(storePath!, exemplars);

          // Compute query embedding
          const queryEmbedding = await computeEmbedding(queryText!);
          if (!queryEmbedding) {
            return createSkillResult<ExemplarStoreOutput>(name, version, startTime, undefined, {
              code: 'EMBEDDING_ERROR',
              message: 'Failed to compute query embedding',
            });
          }

          // Compute similarities
          const matches: ExemplarMatch[] = [];
          for (const exemplar of exemplars) {
            if (exemplar.embedding) {
              const similarity = cosineSimilarity(queryEmbedding, exemplar.embedding);
              if (similarity >= threshold) {
                matches.push({ exemplar, similarity });
              }
            }
          }

          // Sort by similarity and take top K
          matches.sort((a, b) => b.similarity - a.similarity);
          const topMatches = matches.slice(0, topK);

          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            matches: topMatches,
            message: `Found ${topMatches.length} matches`,
          });
        }

        case 'stats': {
          const exemplars = storePath ? getExemplars(storePath) : [];
          const stats: ExemplarStoreStats = {
            totalExemplars: exemplars.length,
            moveTypeCounts: countBy(exemplars, 'moveType'),
            categoryCounts: countBy(exemplars, 'moveCategory'),
            confidenceCounts: countBy(exemplars, 'confidence'),
            embeddedCount: exemplars.filter((e) => e.embedding).length,
          };

          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            stats,
            message: `Store has ${stats.totalExemplars} exemplars`,
          });
        }

        case 'list': {
          let exemplars = getExemplars(storePath!);

          if (moveType) {
            exemplars = exemplars.filter((e) => e.moveType === moveType);
          }

          return createSkillResult(name, version, startTime, {
            operation,
            success: true,
            exemplars,
            message: `Listed ${exemplars.length} exemplars`,
          });
        }

        default:
          return createSkillResult<ExemplarStoreOutput>(name, version, startTime, undefined, {
            code: 'UNKNOWN_OPERATION',
            message: `Unknown operation: ${operation}`,
          });
      }
    } catch (error) {
      return createSkillResult<ExemplarStoreOutput>(name, version, startTime, undefined, {
        code: 'STORE_ERROR',
        message: error instanceof Error ? error.message : 'Store operation failed',
        details: error,
      });
    }
  },
};

export default exemplarStore;
