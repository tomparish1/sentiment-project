import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import { glob } from 'glob';
import { readFileSync, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import {
  SourceLibraryInputSchema,
  type SourceLibraryInput,
  type SourceLibraryOutput,
  type IndexOutput,
  type SearchOutput,
  type ListOutput,
  type StatsOutput,
  type DeleteOutput,
  type SearchResultItem,
  type SourceStats,
} from './schema.js';
import {
  loadSourcesConfig,
  getSourceById,
  getEnabledSources,
  getSourcesByType,
  type SourceConfig,
} from '../../library/sourceConfig.js';
import {
  getVectorStore,
  type IndexFile,
  type ChunkMetadata,
} from '../../library/vectorStore.js';
import { embeddingEngine } from '../embedding-engine/invoke.js';
import { EmbeddingModelPresets } from '../embedding-engine/schema.js';

/**
 * Chunk text into overlapping segments
 */
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): { text: string; start: number; end: number }[] {
  const words = text.split(/\s+/);
  const chunks: { text: string; start: number; end: number }[] = [];

  let position = 0;
  let charPosition = 0;

  while (position < words.length) {
    const chunkWords = words.slice(position, position + chunkSize);
    const chunkText = chunkWords.join(' ');

    if (chunkText.trim().length > 0) {
      chunks.push({
        text: chunkText,
        start: charPosition,
        end: charPosition + chunkText.length,
      });
    }

    const step = Math.max(1, chunkSize - overlap);
    const skippedWords = words.slice(position, position + step);
    charPosition += skippedWords.join(' ').length + 1;
    position += step;
  }

  return chunks;
}

/**
 * Get mime type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext] ?? 'text/plain';
}

/**
 * Read text from a file (plain text only for now)
 */
async function readTextFile(filePath: string): Promise<string | null> {
  const ext = extname(filePath).toLowerCase();

  // For now, only support plain text files
  // PDF and DOCX support would require the document-parser skill
  if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  // Skip binary files for now
  return null;
}

/**
 * Index a source
 */
async function indexSource(
  source: SourceConfig,
  chunkSize: number,
  chunkOverlap: number
): Promise<IndexOutput> {
  const store = getVectorStore();

  // Find all files in the source
  const patterns = source.filePatterns ?? ['**/*.txt', '**/*.md'];
  const excludePatterns = source.excludePatterns ?? ['**/node_modules/**', '**/.git/**'];

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: source.path,
      absolute: true,
      ignore: excludePatterns,
      nodir: true,
    });
    allFiles = allFiles.concat(files);
  }

  // Deduplicate
  allFiles = [...new Set(allFiles)];

  // Process each file
  const allChunks: { metadata: ChunkMetadata; text: string }[] = [];
  let documentsIndexed = 0;

  for (const filePath of allFiles) {
    const text = await readTextFile(filePath);
    if (!text || text.trim().length === 0) continue;

    documentsIndexed++;
    const chunks = chunkText(text, chunkSize, chunkOverlap);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      const metadata: ChunkMetadata = {
        id: `${source.id}-${documentsIndexed}-${i}`,
        sourceId: source.id,
        sourceType: source.type,
        filePath,
        fileName: basename(filePath),
        chunkIndex: i,
        startOffset: chunk.start,
        endOffset: chunk.end,
        wordCount: chunk.text.split(/\s+/).length,
        createdAt: new Date().toISOString(),
      };

      allChunks.push({ metadata, text: chunk.text });
    }
  }

  if (allChunks.length === 0) {
    return {
      sourceId: source.id,
      documentsIndexed: 0,
      chunksCreated: 0,
      dimensions: 0,
      indexPath: '',
    };
  }

  // Generate embeddings for all chunks
  const texts = allChunks.map((c) => c.text);

  // Process in batches to avoid memory issues
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await embeddingEngine.invoke({ texts: batch, model: EmbeddingModelPresets.fast, normalize: true });

    if (!result.success || !result.data) {
      throw new Error(`Embedding failed: ${result.error?.message}`);
    }

    allEmbeddings.push(...result.data.embeddings);
  }

  const dimensions = allEmbeddings[0]?.length ?? 384;

  // Create index file
  const now = new Date().toISOString();
  const indexFile: IndexFile = {
    version: '1.0.0',
    sourceId: source.id,
    createdAt: now,
    updatedAt: now,
    totalChunks: allChunks.length,
    totalDocuments: documentsIndexed,
    dimensions,
    chunks: allChunks,
  };

  // Save to store
  store.saveIndex(source.id, indexFile, allEmbeddings);

  return {
    sourceId: source.id,
    documentsIndexed,
    chunksCreated: allChunks.length,
    dimensions,
    indexPath: `library/indices/${source.id}.json`,
  };
}

/**
 * Search across indexed sources
 */
async function searchSources(
  query: string,
  options: {
    sourceTypes?: string[];
    sourceIds?: string[];
    topK?: number;
    minSimilarity?: number;
  }
): Promise<SearchOutput> {
  const startTime = Date.now();
  const store = getVectorStore();

  // Get query embedding
  const embeddingResult = await embeddingEngine.invoke({ texts: [query], model: EmbeddingModelPresets.fast, normalize: true });
  if (!embeddingResult.success || !embeddingResult.data) {
    throw new Error(`Failed to embed query: ${embeddingResult.error?.message}`);
  }

  const queryEmbedding = embeddingResult.data.embeddings[0];
  if (!queryEmbedding) {
    throw new Error('No embedding generated for query');
  }

  // Determine which sources to search
  let sourceIds = options.sourceIds;

  if (!sourceIds && options.sourceTypes) {
    // Get sources by type
    const sources: SourceConfig[] = [];
    for (const type of options.sourceTypes) {
      sources.push(...getSourcesByType(type as any));
    }
    sourceIds = sources.map((s) => s.id);
  }

  // Search
  const searchResults = store.search(queryEmbedding, {
    sourceIds,
    topK: options.topK ?? 10,
    minSimilarity: options.minSimilarity ?? 0.5,
  });

  // Map to output format
  const results: SearchResultItem[] = searchResults.map((r) => ({
    text: r.chunk.text,
    sourceId: r.chunk.metadata.sourceId,
    sourceType: r.chunk.metadata.sourceType,
    filePath: r.chunk.metadata.filePath,
    fileName: r.chunk.metadata.fileName,
    similarity: r.similarity,
    rank: r.rank,
  }));

  return {
    query,
    results,
    totalResults: results.length,
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * List all sources with optional stats
 */
function listSources(includeStats: boolean): ListOutput {
  const config = loadSourcesConfig();
  const store = getVectorStore();
  const indexedIds = store.getIndexedSourceIds();

  const sources: SourceStats[] = config.sources.map((source) => {
    const indexed = indexedIds.includes(source.id);
    const stats = indexed ? store.getSourceStats(source.id) : undefined;

    return {
      sourceId: source.id,
      label: source.label,
      type: source.type,
      indexed,
      ...(includeStats && stats
        ? {
            totalChunks: stats.totalChunks,
            totalDocuments: stats.totalDocuments,
            dimensions: stats.dimensions,
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt,
          }
        : {}),
    };
  });

  return {
    sources,
    totalSources: sources.length,
    indexedSources: sources.filter((s) => s.indexed).length,
  };
}

/**
 * Get stats for sources
 */
function getStats(sourceId?: string): StatsOutput {
  const store = getVectorStore();
  const config = loadSourcesConfig();

  const sourcesToCheck = sourceId
    ? [getSourceById(sourceId)].filter(Boolean) as SourceConfig[]
    : config.sources;

  const sources: SourceStats[] = sourcesToCheck.map((source) => {
    const indexed = store.hasIndex(source.id);
    const stats = indexed ? store.getSourceStats(source.id) : undefined;

    return {
      sourceId: source.id,
      label: source.label,
      type: source.type,
      indexed,
      ...(stats
        ? {
            totalChunks: stats.totalChunks,
            totalDocuments: stats.totalDocuments,
            dimensions: stats.dimensions,
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt,
          }
        : {}),
    };
  });

  return { sources };
}

/**
 * Delete an index
 */
function deleteIndex(sourceId: string): DeleteOutput {
  const store = getVectorStore();
  const deleted = store.deleteIndex(sourceId);

  return {
    sourceId,
    deleted,
  };
}

export const sourceLibrary: Skill<SourceLibraryInput, SourceLibraryOutput> = {
  metadata: {
    name: 'source-library',
    version: '1.0.0',
    description: 'Index and search across source content libraries',
    category: 'library',
    dependencies: ['embedding-engine'],
  },

  validate(input: SourceLibraryInput) {
    const result = SourceLibraryInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: SourceLibraryInput): Promise<SkillResult<SourceLibraryOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      switch (input.operation) {
        case 'index': {
          const source = getSourceById(input.sourceId);
          if (!source) {
            return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
              code: 'SOURCE_NOT_FOUND',
              message: `Source '${input.sourceId}' not found in configuration`,
            });
          }

          if (!existsSync(source.path)) {
            return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
              code: 'SOURCE_PATH_NOT_FOUND',
              message: `Source path does not exist: ${source.path}`,
            });
          }

          const store = getVectorStore();
          if (store.hasIndex(input.sourceId) && !input.forceReindex) {
            return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
              code: 'INDEX_EXISTS',
              message: `Index already exists for '${input.sourceId}'. Use forceReindex=true to overwrite.`,
            });
          }

          const result = await indexSource(source, input.chunkSize, input.chunkOverlap);
          return createSkillResult(name, version, startTime, result);
        }

        case 'search': {
          const result = await searchSources(input.query, {
            sourceTypes: input.sourceTypes,
            sourceIds: input.sourceIds,
            topK: input.topK,
            minSimilarity: input.minSimilarity,
          });
          return createSkillResult(name, version, startTime, result);
        }

        case 'list': {
          const result = listSources(input.includeStats);
          return createSkillResult(name, version, startTime, result);
        }

        case 'stats': {
          const result = getStats(input.sourceId);
          return createSkillResult(name, version, startTime, result);
        }

        case 'delete': {
          const result = deleteIndex(input.sourceId);
          return createSkillResult(name, version, startTime, result);
        }

        case 'reindex': {
          const source = getSourceById(input.sourceId);
          if (!source) {
            return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
              code: 'SOURCE_NOT_FOUND',
              message: `Source '${input.sourceId}' not found in configuration`,
            });
          }

          // Delete existing index first
          const store = getVectorStore();
          store.deleteIndex(input.sourceId);

          // Re-index
          const result = await indexSource(source, input.chunkSize, input.chunkOverlap);
          return createSkillResult(name, version, startTime, result);
        }

        default:
          return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
            code: 'UNKNOWN_OPERATION',
            message: `Unknown operation`,
          });
      }
    } catch (error) {
      return createSkillResult<SourceLibraryOutput>(name, version, startTime, undefined, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute operation',
        details: error,
      });
    }
  },
};

export default sourceLibrary;
