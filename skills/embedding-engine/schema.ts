import { z } from 'zod';

export const EmbeddingModelPresets = {
  fast: 'Xenova/all-MiniLM-L6-v2', // 384 dimensions, ~30MB
  balanced: 'Xenova/all-mpnet-base-v2', // 768 dimensions, ~420MB
} as const;

export const EmbeddingEngineInputSchema = z.object({
  texts: z.array(z.string()).min(1, 'At least one text is required'),
  model: z.string().optional().default(EmbeddingModelPresets.fast),
  normalize: z.boolean().optional().default(true),
});

export type EmbeddingEngineInput = z.infer<typeof EmbeddingEngineInputSchema>;

export const EmbeddingEngineOutputSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  dimensions: z.number(),
  model: z.string(),
});

export type EmbeddingEngineOutput = z.infer<typeof EmbeddingEngineOutputSchema>;
