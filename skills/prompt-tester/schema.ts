import { z } from 'zod';

/**
 * Operations supported by the prompt-tester skill
 */
export const PromptTesterOperation = z.enum([
  'compare',      // Compare same prompt across providers
  'ab-test',      // A/B test different prompts
  'providers',    // List available providers
  'history',      // Get comparison history
  'quality',      // Get quality metrics
]);

export type PromptTesterOperation = z.infer<typeof PromptTesterOperation>;

/**
 * Provider name enum
 */
export const ProviderNameSchema = z.enum(['claude', 'openai', 'gemini', 'ollama']);

/**
 * Message schema
 */
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

/**
 * Compare operation input
 */
export const CompareInputSchema = z.object({
  operation: z.literal('compare'),
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  providers: z.array(ProviderNameSchema).optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  context: z.string().optional(),
  saveResult: z.boolean().optional().default(true),
});

export type CompareInput = z.infer<typeof CompareInputSchema>;

/**
 * Prompt variant for A/B testing
 */
export const PromptVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
});

/**
 * A/B test operation input
 */
export const ABTestInputSchema = z.object({
  operation: z.literal('ab-test'),
  testName: z.string(),
  variants: z.array(PromptVariantSchema).min(2),
  providers: z.array(ProviderNameSchema).optional(),
  runsPerVariant: z.number().positive().optional().default(1),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ABTestInput = z.infer<typeof ABTestInputSchema>;

/**
 * Providers operation input
 */
export const ProvidersInputSchema = z.object({
  operation: z.literal('providers'),
  checkAvailability: z.boolean().optional().default(true),
});

export type ProvidersInput = z.infer<typeof ProvidersInputSchema>;

/**
 * History operation input
 */
export const HistoryInputSchema = z.object({
  operation: z.literal('history'),
  limit: z.number().positive().optional().default(10),
  context: z.string().optional(),
});

export type HistoryInput = z.infer<typeof HistoryInputSchema>;

/**
 * Quality operation input
 */
export const QualityInputSchema = z.object({
  operation: z.literal('quality'),
  provider: ProviderNameSchema.optional(),
  context: z.string().optional(),
});

export type QualityInput = z.infer<typeof QualityInputSchema>;

/**
 * Combined input schema
 */
export const PromptTesterInputSchema = z.discriminatedUnion('operation', [
  CompareInputSchema,
  ABTestInputSchema,
  ProvidersInputSchema,
  HistoryInputSchema,
  QualityInputSchema,
]);

export type PromptTesterInput = z.infer<typeof PromptTesterInputSchema>;

/**
 * Provider result in output
 */
export const ProviderResultSchema = z.object({
  provider: ProviderNameSchema,
  model: z.string(),
  content: z.string(),
  latencyMs: z.number(),
  tokens: z.number().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type ProviderResultOutput = z.infer<typeof ProviderResultSchema>;

/**
 * Compare output
 */
export const CompareOutputSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  results: z.array(ProviderResultSchema),
  analysis: z.object({
    agreementScore: z.number(),
    fastestProvider: ProviderNameSchema,
    cheapestProvider: ProviderNameSchema.optional(),
    differences: z.array(z.object({
      type: z.string(),
      description: z.string(),
    })),
  }),
  totalTimeMs: z.number(),
});

export type CompareOutput = z.infer<typeof CompareOutputSchema>;

/**
 * Provider info output
 */
export const ProviderInfoSchema = z.object({
  name: ProviderNameSchema,
  displayName: z.string(),
  available: z.boolean(),
  reason: z.string().optional(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
});

export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

/**
 * Providers output
 */
export const ProvidersOutputSchema = z.object({
  providers: z.array(ProviderInfoSchema),
  availableCount: z.number(),
});

export type ProvidersOutput = z.infer<typeof ProvidersOutputSchema>;

/**
 * Quality entry output
 */
export const QualityEntrySchema = z.object({
  provider: ProviderNameSchema,
  context: z.string(),
  successRate: z.number(),
  avgLatencyMs: z.number(),
  avgAgreement: z.number(),
  sampleSize: z.number(),
});

export type QualityEntryOutput = z.infer<typeof QualityEntrySchema>;

/**
 * Combined output type
 */
export type PromptTesterOutput =
  | CompareOutput
  | ProvidersOutput
  | { comparisons: unknown[] }
  | { quality: QualityEntryOutput[] };
