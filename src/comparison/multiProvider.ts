/**
 * Multi-Provider Comparison Runner
 *
 * Executes the same prompt across multiple LLM providers
 * and compares the results.
 */

import { randomUUID } from 'crypto';
import {
  getProvider,
  getAvailableProviders,
  type ProviderName,
  type Message,
  type ChatOptions,
} from '../providers/index.js';
import type {
  ComparisonRun,
  ComparisonOptions,
  ProviderResult,
  ComparisonAnalysis,
  ResponseDiff,
} from './types.js';

/**
 * Run a prompt across multiple providers and compare results
 */
export async function runComparison(
  messages: Message[],
  chatOptions?: ChatOptions,
  comparisonOptions?: ComparisonOptions
): Promise<ComparisonRun> {
  const startTime = Date.now();
  const id = randomUUID();

  // Determine which providers to use
  let providers = comparisonOptions?.providers;
  if (!providers || providers.length === 0) {
    providers = await getAvailableProviders();
  }

  if (providers.length === 0) {
    throw new Error('No providers available for comparison');
  }

  // Run comparisons
  const results: ProviderResult[] = [];

  if (comparisonOptions?.parallel !== false) {
    // Run in parallel
    const promises = providers.map((providerName) =>
      runSingleProvider(
        providerName,
        messages,
        chatOptions,
        comparisonOptions?.modelOverrides?.[providerName]
      )
    );
    results.push(...(await Promise.all(promises)));
  } else {
    // Run sequentially
    for (const providerName of providers) {
      const result = await runSingleProvider(
        providerName,
        messages,
        chatOptions,
        comparisonOptions?.modelOverrides?.[providerName]
      );
      results.push(result);
    }
  }

  // Analyze results
  const analysis = analyzeResults(results);

  return {
    id,
    timestamp: new Date().toISOString(),
    input: {
      messages,
      options: chatOptions,
    },
    providers,
    results,
    analysis,
    totalTimeMs: Date.now() - startTime,
    tags: comparisonOptions?.tags,
    context: comparisonOptions?.context,
  };
}

/**
 * Run a single provider
 */
async function runSingleProvider(
  providerName: ProviderName,
  messages: Message[],
  options?: ChatOptions,
  modelOverride?: string
): Promise<ProviderResult> {
  try {
    const provider = getProvider(providerName);
    const finalOptions = modelOverride
      ? { ...options, model: modelOverride }
      : options;

    const response = await provider.chat(messages, finalOptions);

    return {
      provider: providerName,
      model: response.model,
      response,
      success: true,
    };
  } catch (error) {
    return {
      provider: providerName,
      model: modelOverride ?? 'unknown',
      response: {
        content: '',
        model: modelOverride ?? 'unknown',
        provider: providerName,
        latencyMs: 0,
        finishReason: 'error',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
}

/**
 * Analyze comparison results
 */
function analyzeResults(results: ProviderResult[]): ComparisonAnalysis {
  const successfulResults = results.filter((r) => r.success);
  const differences: ResponseDiff[] = [];

  // Find fastest provider
  const fastestResult = successfulResults.reduce((a, b) =>
    a.response.latencyMs < b.response.latencyMs ? a : b
  );
  const fastestProvider = fastestResult?.provider ?? results[0]?.provider ?? 'claude';

  // Find cheapest provider (if cost info available)
  let cheapestProvider: ProviderName | undefined;
  const withCost = successfulResults.filter(
    (r) => r.response.usage?.totalTokens !== undefined
  );
  if (withCost.length > 0) {
    // Simple heuristic: fewer tokens = cheaper (ignoring per-token costs)
    const cheapest = withCost.reduce((a, b) =>
      (a.response.usage?.totalTokens ?? 0) < (b.response.usage?.totalTokens ?? 0)
        ? a
        : b
    );
    cheapestProvider = cheapest.provider;
  }

  // Compare pairs for differences
  for (let i = 0; i < successfulResults.length; i++) {
    for (let j = i + 1; j < successfulResults.length; j++) {
      const a = successfulResults[i];
      const b = successfulResults[j];
      if (!a || !b) continue;

      // Length difference
      const lenA = a.response.content.length;
      const lenB = b.response.content.length;
      if (Math.abs(lenA - lenB) > 100) {
        differences.push({
          type: 'length',
          description: `Response length differs by ${Math.abs(lenA - lenB)} characters`,
          providerA: a.provider,
          providerB: b.provider,
          valueA: lenA,
          valueB: lenB,
          delta: lenA - lenB,
        });
      }

      // Latency difference
      const latA = a.response.latencyMs;
      const latB = b.response.latencyMs;
      if (Math.abs(latA - latB) > 1000) {
        differences.push({
          type: 'latency',
          description: `Latency differs by ${Math.abs(latA - latB)}ms`,
          providerA: a.provider,
          providerB: b.provider,
          valueA: latA,
          valueB: latB,
          delta: latA - latB,
        });
      }
    }
  }

  // Calculate agreement score based on response length similarity
  let agreementScore = 1.0;
  if (successfulResults.length >= 2) {
    const lengths = successfulResults.map((r) => r.response.content.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
      lengths.length;
    const stdDev = Math.sqrt(variance);
    // Normalize: low stdDev relative to avg = high agreement
    agreementScore = Math.max(0, 1 - stdDev / (avgLength || 1));
  }

  return {
    agreementScore,
    differences,
    fastestProvider,
    cheapestProvider,
  };
}

/**
 * Compare just two providers directly
 */
export async function compareTwoProviders(
  providerA: ProviderName,
  providerB: ProviderName,
  messages: Message[],
  options?: ChatOptions
): Promise<ComparisonRun> {
  return runComparison(messages, options, {
    providers: [providerA, providerB],
    parallel: true,
  });
}

/**
 * Quick comparison of all available providers
 */
export async function quickCompare(
  prompt: string,
  systemPrompt?: string
): Promise<ComparisonRun> {
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  return runComparison(messages);
}
