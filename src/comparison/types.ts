/**
 * Comparison Module Types
 *
 * Types for multi-provider comparison, A/B testing, and quality tracking
 */

import type { ChatResponse, Message, ChatOptions, ProviderName } from '../providers/index.js';

/**
 * Result from a single provider
 */
export interface ProviderResult {
  provider: ProviderName;
  model: string;
  response: ChatResponse;
  error?: string;
  success: boolean;
}

/**
 * Difference between two responses
 */
export interface ResponseDiff {
  type: 'content' | 'length' | 'latency' | 'cost';
  description: string;
  providerA: string;
  providerB: string;
  valueA: string | number;
  valueB: string | number;
  delta?: number;
}

/**
 * Comparison between provider results
 */
export interface ComparisonAnalysis {
  /** Overall agreement score 0-1 */
  agreementScore: number;
  /** Semantic similarity if computed */
  semanticSimilarity?: number;
  /** Key differences found */
  differences: ResponseDiff[];
  /** Which provider had the best result (if determinable) */
  winner?: ProviderName;
  /** Reason for winner selection */
  winnerReason?: string;
  /** Fastest provider */
  fastestProvider: ProviderName;
  /** Most cost-effective provider */
  cheapestProvider?: ProviderName;
}

/**
 * Full comparison run result
 */
export interface ComparisonRun {
  id: string;
  timestamp: string;
  /** Original prompt/messages */
  input: {
    messages: Message[];
    options?: ChatOptions;
  };
  /** Providers that were compared */
  providers: ProviderName[];
  /** Results from each provider */
  results: ProviderResult[];
  /** Analysis of the comparison */
  analysis: ComparisonAnalysis;
  /** Total execution time */
  totalTimeMs: number;
  /** Tags for categorization */
  tags?: string[];
  /** Skill or context this comparison was for */
  context?: string;
}

/**
 * Options for running a comparison
 */
export interface ComparisonOptions {
  /** Providers to compare (default: all available) */
  providers?: ProviderName[];
  /** Run providers in parallel (default: true) */
  parallel?: boolean;
  /** Compute semantic similarity (requires embeddings) */
  computeSimilarity?: boolean;
  /** Tags for the comparison */
  tags?: string[];
  /** Context identifier */
  context?: string;
  /** Custom model overrides per provider */
  modelOverrides?: Partial<Record<ProviderName, string>>;
}

/**
 * A/B test variant
 */
export interface PromptVariant {
  id: string;
  name: string;
  messages: Message[];
  description?: string;
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  description?: string;
  variants: PromptVariant[];
  providers: ProviderName[];
  /** Number of runs per variant */
  runsPerVariant?: number;
  /** Evaluation criteria */
  criteria?: string[];
}

/**
 * A/B test result
 */
export interface ABTestResult {
  testId: string;
  timestamp: string;
  config: ABTestConfig;
  runs: Array<{
    variantId: string;
    provider: ProviderName;
    run: ComparisonRun;
  }>;
  /** Winner per criteria */
  winners: Record<string, { variantId: string; reason: string }>;
  /** Summary statistics */
  summary: {
    totalRuns: number;
    successRate: number;
    avgLatencyMs: Record<ProviderName, number>;
  };
}

/**
 * Quality tracking entry
 */
export interface QualityEntry {
  timestamp: string;
  provider: ProviderName;
  model: string;
  context: string;
  /** Success rate 0-1 */
  successRate: number;
  /** Average latency */
  avgLatencyMs: number;
  /** Average agreement with other providers */
  avgAgreement: number;
  /** Number of comparisons */
  sampleSize: number;
}

/**
 * Quality summary for a provider
 */
export interface ProviderQualitySummary {
  provider: ProviderName;
  /** Overall quality score 0-1 */
  qualityScore: number;
  /** Reliability (success rate) */
  reliability: number;
  /** Speed score (inverse of latency) */
  speedScore: number;
  /** Agreement with consensus */
  consensusScore: number;
  /** Trend over time */
  trend: 'improving' | 'stable' | 'declining';
  /** Last updated */
  lastUpdated: string;
}
