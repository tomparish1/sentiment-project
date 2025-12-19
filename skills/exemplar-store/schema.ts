import { z } from 'zod';

export const ExemplarConfidence = z.enum(['high', 'medium', 'low']);

export type ExemplarConfidence = z.infer<typeof ExemplarConfidence>;

export const ExemplarSchema = z.object({
  id: z.string(),
  text: z.string(),
  moveType: z.string(),
  moveCategory: z.string(),
  contextBefore: z.string().optional(),
  contextAfter: z.string().optional(),
  sourceFile: z.string().optional(),
  sourceTitle: z.string().optional(),
  speaker: z.string().optional(),
  confidence: ExemplarConfidence.optional().default('high'),
  notes: z.string().optional(),
  annotatedBy: z.string().optional(),
  annotatedDate: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  embeddingModel: z.string().optional(),
});

export type Exemplar = z.infer<typeof ExemplarSchema>;

export const ExemplarStoreOperation = z.enum([
  'load',
  'save',
  'add',
  'remove',
  'search',
  'stats',
  'list',
]);

export type ExemplarStoreOperation = z.infer<typeof ExemplarStoreOperation>;

export const ExemplarStoreInputSchema = z.object({
  operation: ExemplarStoreOperation,
  storePath: z.string().optional(),
  exemplar: z
    .object({
      text: z.string(),
      moveType: z.string(),
      moveCategory: z.string(),
      contextBefore: z.string().optional(),
      contextAfter: z.string().optional(),
      sourceFile: z.string().optional(),
      sourceTitle: z.string().optional(),
      speaker: z.string().optional(),
      confidence: ExemplarConfidence.optional(),
      notes: z.string().optional(),
    })
    .optional(),
  exemplarId: z.string().optional(),
  text: z.string().optional(),
  topK: z.number().positive().optional().default(5),
  threshold: z.number().min(0).max(1).optional().default(0),
  moveType: z.string().optional(),
});

export type ExemplarStoreInput = z.infer<typeof ExemplarStoreInputSchema>;

export const ExemplarMatchSchema = z.object({
  exemplar: ExemplarSchema,
  similarity: z.number(),
});

export type ExemplarMatch = z.infer<typeof ExemplarMatchSchema>;

export const ExemplarStoreStatsSchema = z.object({
  totalExemplars: z.number(),
  moveTypeCounts: z.record(z.string(), z.number()),
  categoryCounts: z.record(z.string(), z.number()),
  confidenceCounts: z.record(z.string(), z.number()),
  embeddedCount: z.number(),
});

export type ExemplarStoreStats = z.infer<typeof ExemplarStoreStatsSchema>;

export const ExemplarStoreOutputSchema = z.object({
  operation: ExemplarStoreOperation,
  success: z.boolean(),
  exemplars: z.array(ExemplarSchema).optional(),
  matches: z.array(ExemplarMatchSchema).optional(),
  stats: ExemplarStoreStatsSchema.optional(),
  addedExemplar: ExemplarSchema.optional(),
  removedId: z.string().optional(),
  message: z.string().optional(),
});

export type ExemplarStoreOutput = z.infer<typeof ExemplarStoreOutputSchema>;
