import { z } from 'zod';
import { SourceType } from '../../library/sourceConfig.js';

/**
 * Operations supported by the source-library skill
 */
export const SourceLibraryOperation = z.enum([
  'index',      // Index a source
  'search',     // Semantic search
  'list',       // List indexed sources
  'stats',      // Get indexing statistics
  'delete',     // Delete an index
  'reindex',    // Re-index a source
]);

export type SourceLibraryOperation = z.infer<typeof SourceLibraryOperation>;

/**
 * Index operation input
 */
export const IndexInputSchema = z.object({
  operation: z.literal('index'),
  sourceId: z.string(),
  chunkSize: z.number().positive().optional().default(500),
  chunkOverlap: z.number().nonnegative().optional().default(50),
  forceReindex: z.boolean().optional().default(false),
});

export type IndexInput = z.infer<typeof IndexInputSchema>;

/**
 * Search operation input
 */
export const SearchInputSchema = z.object({
  operation: z.literal('search'),
  query: z.string().min(1, 'Query is required'),
  sourceTypes: z.array(SourceType).optional(),
  sourceIds: z.array(z.string()).optional(),
  topK: z.number().positive().optional().default(10),
  minSimilarity: z.number().min(0).max(1).optional().default(0.5),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

/**
 * List operation input
 */
export const ListInputSchema = z.object({
  operation: z.literal('list'),
  includeStats: z.boolean().optional().default(false),
});

export type ListInput = z.infer<typeof ListInputSchema>;

/**
 * Stats operation input
 */
export const StatsInputSchema = z.object({
  operation: z.literal('stats'),
  sourceId: z.string().optional(), // If not provided, returns all sources
});

export type StatsInput = z.infer<typeof StatsInputSchema>;

/**
 * Delete operation input
 */
export const DeleteInputSchema = z.object({
  operation: z.literal('delete'),
  sourceId: z.string(),
});

export type DeleteInput = z.infer<typeof DeleteInputSchema>;

/**
 * Reindex operation input
 */
export const ReindexInputSchema = z.object({
  operation: z.literal('reindex'),
  sourceId: z.string(),
  chunkSize: z.number().positive().optional().default(500),
  chunkOverlap: z.number().nonnegative().optional().default(50),
});

export type ReindexInput = z.infer<typeof ReindexInputSchema>;

/**
 * Combined input schema
 */
export const SourceLibraryInputSchema = z.discriminatedUnion('operation', [
  IndexInputSchema,
  SearchInputSchema,
  ListInputSchema,
  StatsInputSchema,
  DeleteInputSchema,
  ReindexInputSchema,
]);

export type SourceLibraryInput = z.infer<typeof SourceLibraryInputSchema>;

/**
 * Search result item
 */
export const SearchResultItemSchema = z.object({
  text: z.string(),
  sourceId: z.string(),
  sourceType: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  similarity: z.number(),
  rank: z.number(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * Index output
 */
export const IndexOutputSchema = z.object({
  sourceId: z.string(),
  documentsIndexed: z.number(),
  chunksCreated: z.number(),
  dimensions: z.number(),
  indexPath: z.string(),
});

export type IndexOutput = z.infer<typeof IndexOutputSchema>;

/**
 * Search output
 */
export const SearchOutputSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultItemSchema),
  totalResults: z.number(),
  searchTimeMs: z.number(),
});

export type SearchOutput = z.infer<typeof SearchOutputSchema>;

/**
 * Source stats
 */
export const SourceStatsSchema = z.object({
  sourceId: z.string(),
  label: z.string(),
  type: z.string(),
  indexed: z.boolean(),
  totalChunks: z.number().optional(),
  totalDocuments: z.number().optional(),
  dimensions: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SourceStats = z.infer<typeof SourceStatsSchema>;

/**
 * List output
 */
export const ListOutputSchema = z.object({
  sources: z.array(SourceStatsSchema),
  totalSources: z.number(),
  indexedSources: z.number(),
});

export type ListOutput = z.infer<typeof ListOutputSchema>;

/**
 * Stats output
 */
export const StatsOutputSchema = z.object({
  sources: z.array(SourceStatsSchema),
});

export type StatsOutput = z.infer<typeof StatsOutputSchema>;

/**
 * Delete output
 */
export const DeleteOutputSchema = z.object({
  sourceId: z.string(),
  deleted: z.boolean(),
});

export type DeleteOutput = z.infer<typeof DeleteOutputSchema>;

/**
 * Combined output type
 */
export type SourceLibraryOutput =
  | IndexOutput
  | SearchOutput
  | ListOutput
  | StatsOutput
  | DeleteOutput;
