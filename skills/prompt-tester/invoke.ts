/**
 * Prompt Tester Skill
 *
 * Multi-provider comparison and A/B testing for prompts.
 */

import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  PromptTesterInputSchema,
  type PromptTesterInput,
  type PromptTesterOutput,
  type CompareOutput,
  type ProvidersOutput,
  type ProviderResultOutput,
} from './schema.js';
import {
  runComparison,
  getComparisonStorage,
} from '../../src/comparison/index.js';
import {
  getProviderNames,
  getProviderStatus,
  getProvider,
  type ProviderName,
  type Message,
} from '../../src/providers/index.js';

export const promptTester: Skill<PromptTesterInput, PromptTesterOutput> = {
  metadata: {
    name: 'prompt-tester',
    version: '1.0.0',
    description: 'Compare prompts across multiple LLM providers and run A/B tests',
    category: 'comparison',
    dependencies: [],
  },

  validate(input: PromptTesterInput) {
    const result = PromptTesterInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: PromptTesterInput): Promise<SkillResult<PromptTesterOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<PromptTesterOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      switch (input.operation) {
        case 'compare': {
          // Build messages
          const messages: Message[] = [];
          if (input.systemPrompt) {
            messages.push({ role: 'system', content: input.systemPrompt });
          }
          messages.push({ role: 'user', content: input.prompt });

          // Run comparison
          const comparison = await runComparison(
            messages,
            {
              maxTokens: input.maxTokens,
              temperature: input.temperature,
            },
            {
              providers: input.providers as ProviderName[] | undefined,
              context: input.context,
            }
          );

          // Save if requested
          if (input.saveResult !== false) {
            const storage = getComparisonStorage();
            storage.saveComparison(comparison);
          }

          // Format output
          const results: ProviderResultOutput[] = comparison.results.map((r) => ({
            provider: r.provider,
            model: r.model,
            content: r.response.content,
            latencyMs: r.response.latencyMs,
            tokens: r.response.usage?.totalTokens,
            success: r.success,
            error: r.error,
          }));

          const output: CompareOutput = {
            id: comparison.id,
            prompt: input.prompt,
            results,
            analysis: {
              agreementScore: comparison.analysis.agreementScore,
              fastestProvider: comparison.analysis.fastestProvider,
              cheapestProvider: comparison.analysis.cheapestProvider,
              differences: comparison.analysis.differences.map((d) => ({
                type: d.type,
                description: d.description,
              })),
            },
            totalTimeMs: comparison.totalTimeMs,
          };

          return createSkillResult(name, version, startTime, output);
        }

        case 'ab-test': {
          // Run A/B test (simplified - just runs each variant)
          const results: Array<{
            variantId: string;
            variantName: string;
            results: ProviderResultOutput[];
          }> = [];

          for (const variant of input.variants) {
            const messages: Message[] = [];
            if (variant.systemPrompt) {
              messages.push({ role: 'system', content: variant.systemPrompt });
            }
            messages.push({ role: 'user', content: variant.prompt });

            const comparison = await runComparison(
              messages,
              {
                maxTokens: input.maxTokens,
                temperature: input.temperature,
              },
              {
                providers: input.providers as ProviderName[] | undefined,
                context: `ab-test:${input.testName}`,
              }
            );

            results.push({
              variantId: variant.id,
              variantName: variant.name,
              results: comparison.results.map((r) => ({
                provider: r.provider,
                model: r.model,
                content: r.response.content,
                latencyMs: r.response.latencyMs,
                tokens: r.response.usage?.totalTokens,
                success: r.success,
                error: r.error,
              })),
            });
          }

          return createSkillResult(name, version, startTime, {
            testName: input.testName,
            variants: results,
          } as unknown as PromptTesterOutput);
        }

        case 'providers': {
          const names = getProviderNames();
          const status = input.checkAvailability
            ? await getProviderStatus()
            : Object.fromEntries(names.map((n) => [n, { available: true }]));

          const providers = names.map((providerName) => {
            const provider = getProvider(providerName);
            const s = status[providerName] as { available: boolean; reason?: string } | undefined;
            return {
              name: providerName,
              displayName: provider.metadata.displayName,
              available: s?.available ?? false,
              reason: s?.reason,
              models: provider.getModels().map((m) => ({
                id: m.id,
                name: m.name,
              })),
            };
          });

          const output: ProvidersOutput = {
            providers,
            availableCount: providers.filter((p) => p.available).length,
          };

          return createSkillResult(name, version, startTime, output);
        }

        case 'history': {
          const storage = getComparisonStorage();
          let comparisons = input.context
            ? storage.getComparisonsByContext(input.context)
            : storage.getRecentComparisons(input.limit);

          // Limit results
          comparisons = comparisons.slice(0, input.limit);

          return createSkillResult(name, version, startTime, {
            comparisons: comparisons.map((c) => ({
              id: c.id,
              timestamp: c.timestamp,
              context: c.context,
              providers: c.providers,
              agreementScore: c.analysis.agreementScore,
            })),
          } as unknown as PromptTesterOutput);
        }

        case 'quality': {
          const storage = getComparisonStorage();

          let entries = input.provider
            ? storage.getProviderQuality(input.provider)
            : storage.getQualityLeaderboard(input.context);

          return createSkillResult(name, version, startTime, {
            quality: entries.map((e) => ({
              provider: e.provider,
              context: e.context,
              successRate: e.successRate,
              avgLatencyMs: e.avgLatencyMs,
              avgAgreement: e.avgAgreement,
              sampleSize: e.sampleSize,
            })),
          } as unknown as PromptTesterOutput);
        }

        default:
          return createSkillResult<PromptTesterOutput>(name, version, startTime, undefined, {
            code: 'UNKNOWN_OPERATION',
            message: 'Unknown operation',
          });
      }
    } catch (error) {
      return createSkillResult<PromptTesterOutput>(name, version, startTime, undefined, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute operation',
        details: error,
      });
    }
  },
};

export default promptTester;
