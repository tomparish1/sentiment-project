import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Chunk metadata schema
 */
export const ChunkMetadataSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceType: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  chunkIndex: z.number(),
  startOffset: z.number(),
  endOffset: z.number(),
  wordCount: z.number(),
  createdAt: z.string(),
});

export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

/**
 * Stored chunk with text and embedding
 */
export interface StoredChunk {
  metadata: ChunkMetadata;
  text: string;
  embedding: number[];
}

/**
 * Index file schema
 */
export const IndexFileSchema = z.object({
  version: z.string(),
  sourceId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalChunks: z.number(),
  totalDocuments: z.number(),
  dimensions: z.number(),
  chunks: z.array(
    z.object({
      metadata: ChunkMetadataSchema,
      text: z.string(),
    })
  ),
});

export type IndexFile = z.infer<typeof IndexFileSchema>;

/**
 * Search result
 */
export interface SearchResult {
  chunk: StoredChunk;
  similarity: number;
  rank: number;
}

/**
 * Vector store for managing indexed content
 */
export class VectorStore {
  private indicesDir: string;
  private vectorsDir: string;
  private indices: Map<string, IndexFile> = new Map();
  private vectors: Map<string, number[][]> = new Map();

  constructor(basePath?: string) {
    const base = basePath ?? __dirname;
    this.indicesDir = join(base, 'indices');
    this.vectorsDir = join(base, 'vectors');

    // Ensure directories exist
    if (!existsSync(this.indicesDir)) {
      mkdirSync(this.indicesDir, { recursive: true });
    }
    if (!existsSync(this.vectorsDir)) {
      mkdirSync(this.vectorsDir, { recursive: true });
    }
  }

  /**
   * Get index file path for a source
   */
  private getIndexPath(sourceId: string): string {
    return join(this.indicesDir, `${sourceId}.json`);
  }

  /**
   * Get vectors file path for a source
   */
  private getVectorsPath(sourceId: string): string {
    return join(this.vectorsDir, `${sourceId}.bin`);
  }

  /**
   * Check if an index exists for a source
   */
  hasIndex(sourceId: string): boolean {
    return existsSync(this.getIndexPath(sourceId));
  }

  /**
   * Load an index from disk
   */
  loadIndex(sourceId: string): IndexFile | undefined {
    if (this.indices.has(sourceId)) {
      return this.indices.get(sourceId);
    }

    const indexPath = this.getIndexPath(sourceId);
    if (!existsSync(indexPath)) {
      return undefined;
    }

    const content = readFileSync(indexPath, 'utf-8');
    const data = JSON.parse(content);
    const index = IndexFileSchema.parse(data);
    this.indices.set(sourceId, index);
    return index;
  }

  /**
   * Load vectors from disk
   */
  loadVectors(sourceId: string): number[][] | undefined {
    if (this.vectors.has(sourceId)) {
      return this.vectors.get(sourceId);
    }

    const vectorsPath = this.getVectorsPath(sourceId);
    if (!existsSync(vectorsPath)) {
      return undefined;
    }

    const buffer = readFileSync(vectorsPath);
    const index = this.loadIndex(sourceId);
    if (!index) return undefined;

    const dimensions = index.dimensions;
    const numVectors = index.totalChunks;
    const vectors: number[][] = [];

    // Read Float32 values
    for (let i = 0; i < numVectors; i++) {
      const vector: number[] = [];
      for (let j = 0; j < dimensions; j++) {
        const offset = (i * dimensions + j) * 4;
        vector.push(buffer.readFloatLE(offset));
      }
      vectors.push(vector);
    }

    this.vectors.set(sourceId, vectors);
    return vectors;
  }

  /**
   * Save an index to disk
   */
  saveIndex(sourceId: string, index: IndexFile, embeddings: number[][]): void {
    // Save index JSON
    const indexPath = this.getIndexPath(sourceId);
    writeFileSync(indexPath, JSON.stringify(index, null, 2));
    this.indices.set(sourceId, index);

    // Save vectors as binary
    const vectorsPath = this.getVectorsPath(sourceId);
    const dimensions = index.dimensions;
    const buffer = Buffer.alloc(embeddings.length * dimensions * 4);

    for (let i = 0; i < embeddings.length; i++) {
      const embedding = embeddings[i];
      if (!embedding) continue;
      for (let j = 0; j < dimensions; j++) {
        const offset = (i * dimensions + j) * 4;
        buffer.writeFloatLE(embedding[j] ?? 0, offset);
      }
    }

    writeFileSync(vectorsPath, buffer);
    this.vectors.set(sourceId, embeddings);
  }

  /**
   * Search across all indexed sources
   */
  search(
    queryEmbedding: number[],
    options: {
      sourceIds?: string[];
      topK?: number;
      minSimilarity?: number;
    } = {}
  ): SearchResult[] {
    const { topK = 10, minSimilarity = 0.5 } = options;
    let { sourceIds } = options;

    // Get all available source IDs if not specified
    if (!sourceIds) {
      sourceIds = this.getIndexedSourceIds();
    }

    const results: SearchResult[] = [];

    for (const sourceId of sourceIds) {
      const index = this.loadIndex(sourceId);
      const vectors = this.loadVectors(sourceId);

      if (!index || !vectors) continue;

      for (let i = 0; i < vectors.length; i++) {
        const embedding = vectors[i];
        const chunkData = index.chunks[i];
        if (!embedding || !chunkData) continue;

        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= minSimilarity) {
          results.push({
            chunk: {
              metadata: chunkData.metadata,
              text: chunkData.text,
              embedding,
            },
            similarity,
            rank: 0, // Will be set after sorting
          });
        }
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Take top K and assign ranks
    const topResults = results.slice(0, topK);
    topResults.forEach((r, i) => {
      r.rank = i + 1;
    });

    return topResults;
  }

  /**
   * Get all indexed source IDs
   */
  getIndexedSourceIds(): string[] {
    if (!existsSync(this.indicesDir)) return [];

    const files = readdirSync(this.indicesDir) as string[];
    return files
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''));
  }

  /**
   * Get statistics for a source
   */
  getSourceStats(sourceId: string): {
    totalChunks: number;
    totalDocuments: number;
    dimensions: number;
    createdAt: string;
    updatedAt: string;
  } | undefined {
    const index = this.loadIndex(sourceId);
    if (!index) return undefined;

    return {
      totalChunks: index.totalChunks,
      totalDocuments: index.totalDocuments,
      dimensions: index.dimensions,
      createdAt: index.createdAt,
      updatedAt: index.updatedAt,
    };
  }

  /**
   * Delete an index
   */
  deleteIndex(sourceId: string): boolean {
    const indexPath = this.getIndexPath(sourceId);
    const vectorsPath = this.getVectorsPath(sourceId);

    let deleted = false;

    if (existsSync(indexPath)) {
      unlinkSync(indexPath);
      this.indices.delete(sourceId);
      deleted = true;
    }

    if (existsSync(vectorsPath)) {
      unlinkSync(vectorsPath);
      this.vectors.delete(sourceId);
      deleted = true;
    }

    return deleted;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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
}

// Default store instance
let defaultStore: VectorStore | null = null;

export function getVectorStore(basePath?: string): VectorStore {
  if (!defaultStore || basePath) {
    defaultStore = new VectorStore(basePath);
  }
  return defaultStore;
}
