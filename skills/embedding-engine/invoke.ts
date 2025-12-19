import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  EmbeddingEngineInputSchema,
  EmbeddingModelPresets,
  type EmbeddingEngineInput,
  type EmbeddingEngineOutput,
} from './schema.js';

// Lazy-loaded pipeline cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineCache: Map<string, any> = new Map();

/**
 * Get or create an embedding pipeline for the specified model.
 * Uses dynamic import for lazy loading of the transformers library.
 */
async function getEmbeddingPipeline(modelName: string) {
  if (pipelineCache.has(modelName)) {
    return pipelineCache.get(modelName);
  }

  // Dynamic import to avoid loading the library until needed
  const { pipeline } = await import('@xenova/transformers');

  const extractor = await pipeline('feature-extraction', modelName, {
    // Use quantized models for faster loading
    quantized: true,
  });

  pipelineCache.set(modelName, extractor);
  return extractor;
}

/**
 * Normalize a vector to unit length (L2 normalization)
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Compute similarity matrix between query and corpus embeddings
 */
export function similarityMatrix(
  queries: number[][],
  corpus: number[],
  normalized: boolean = true
): number[][] {
  return queries.map((query) => {
    if (normalized) {
      // If normalized, dot product equals cosine similarity
      return [query.reduce((sum, val, i) => sum + val * (corpus[i] ?? 0), 0)];
    }
    return [cosineSimilarity(query, corpus)];
  });
}

export const embeddingEngine: Skill<EmbeddingEngineInput, EmbeddingEngineOutput> = {
  metadata: {
    name: 'embedding-engine',
    version: '1.0.0',
    description: 'Compute text embeddings using transformer models',
    category: 'embedding',
    dependencies: ['@xenova/transformers'],
  },

  validate(input: EmbeddingEngineInput) {
    const result = EmbeddingEngineInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: EmbeddingEngineInput): Promise<SkillResult<EmbeddingEngineOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<EmbeddingEngineOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const { texts, model = EmbeddingModelPresets.fast, normalize = true } = input;

      // Get or create the embedding pipeline
      const extractor = await getEmbeddingPipeline(model);

      // Process all texts
      const embeddings: number[][] = [];

      for (const text of texts) {
        // Run the model
        const output = await extractor(text, {
          pooling: 'mean',
          normalize: false, // We'll handle normalization ourselves for consistency
        });

        // Extract the embedding array
        let embedding = Array.from(output.data) as number[];

        // Normalize if requested
        if (normalize) {
          embedding = normalizeVector(embedding);
        }

        embeddings.push(embedding);
      }

      const dimensions = embeddings[0]?.length ?? 0;

      return createSkillResult(name, version, startTime, {
        embeddings,
        dimensions,
        model,
      });
    } catch (error) {
      // Check for missing dependency
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        return createSkillResult<EmbeddingEngineOutput>(name, version, startTime, undefined, {
          code: 'DEPENDENCY_ERROR',
          message:
            '@xenova/transformers is not installed. Run: npm install @xenova/transformers',
        });
      }

      return createSkillResult<EmbeddingEngineOutput>(name, version, startTime, undefined, {
        code: 'EMBEDDING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to compute embeddings',
        details: error,
      });
    }
  },
};

// Export utilities for use by other skills
export { normalizeVector, EmbeddingModelPresets };

export default embeddingEngine;
