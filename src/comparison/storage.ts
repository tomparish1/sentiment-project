/**
 * Comparison Storage
 *
 * Persists comparison history and quality metrics.
 * Uses JSON files for simplicity (can upgrade to SQLite later).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ComparisonRun, QualityEntry, ABTestResult } from './types.js';
import type { ProviderName } from '../providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data/comparisons');

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Storage for comparison runs
 */
export class ComparisonStorage {
  private comparisonsFile: string;
  private qualityFile: string;
  private abTestsFile: string;

  constructor() {
    ensureDataDir();
    this.comparisonsFile = join(DATA_DIR, 'comparisons.json');
    this.qualityFile = join(DATA_DIR, 'quality.json');
    this.abTestsFile = join(DATA_DIR, 'ab-tests.json');
  }

  /**
   * Save a comparison run
   */
  saveComparison(run: ComparisonRun): void {
    const comparisons = this.loadComparisons();
    comparisons.push(run);

    // Keep only last 1000 comparisons
    if (comparisons.length > 1000) {
      comparisons.splice(0, comparisons.length - 1000);
    }

    writeFileSync(this.comparisonsFile, JSON.stringify(comparisons, null, 2));

    // Update quality metrics
    this.updateQualityMetrics(run);
  }

  /**
   * Load all comparisons
   */
  loadComparisons(): ComparisonRun[] {
    if (!existsSync(this.comparisonsFile)) {
      return [];
    }
    const content = readFileSync(this.comparisonsFile, 'utf-8');
    return JSON.parse(content) as ComparisonRun[];
  }

  /**
   * Get comparison by ID
   */
  getComparison(id: string): ComparisonRun | undefined {
    const comparisons = this.loadComparisons();
    return comparisons.find((c) => c.id === id);
  }

  /**
   * Get recent comparisons
   */
  getRecentComparisons(limit: number = 10): ComparisonRun[] {
    const comparisons = this.loadComparisons();
    return comparisons.slice(-limit).reverse();
  }

  /**
   * Get comparisons by context
   */
  getComparisonsByContext(context: string): ComparisonRun[] {
    return this.loadComparisons().filter((c) => c.context === context);
  }

  /**
   * Update quality metrics based on comparison
   */
  private updateQualityMetrics(run: ComparisonRun): void {
    const quality = this.loadQualityMetrics();

    for (const result of run.results) {
      const key = `${result.provider}:${run.context ?? 'general'}`;
      const existing = quality[key];

      if (existing) {
        // Update running averages
        const n = existing.sampleSize;
        existing.successRate =
          (existing.successRate * n + (result.success ? 1 : 0)) / (n + 1);
        existing.avgLatencyMs =
          (existing.avgLatencyMs * n + result.response.latencyMs) / (n + 1);
        existing.avgAgreement =
          (existing.avgAgreement * n + run.analysis.agreementScore) / (n + 1);
        existing.sampleSize = n + 1;
        existing.timestamp = run.timestamp;
      } else {
        quality[key] = {
          timestamp: run.timestamp,
          provider: result.provider,
          model: result.model,
          context: run.context ?? 'general',
          successRate: result.success ? 1 : 0,
          avgLatencyMs: result.response.latencyMs,
          avgAgreement: run.analysis.agreementScore,
          sampleSize: 1,
        };
      }
    }

    writeFileSync(this.qualityFile, JSON.stringify(quality, null, 2));
  }

  /**
   * Load quality metrics
   */
  loadQualityMetrics(): Record<string, QualityEntry> {
    if (!existsSync(this.qualityFile)) {
      return {};
    }
    const content = readFileSync(this.qualityFile, 'utf-8');
    return JSON.parse(content) as Record<string, QualityEntry>;
  }

  /**
   * Get quality summary for a provider
   */
  getProviderQuality(provider: ProviderName): QualityEntry[] {
    const quality = this.loadQualityMetrics();
    return Object.values(quality).filter((q) => q.provider === provider);
  }

  /**
   * Get quality leaderboard
   */
  getQualityLeaderboard(context?: string): QualityEntry[] {
    const quality = this.loadQualityMetrics();
    let entries = Object.values(quality);

    if (context) {
      entries = entries.filter((q) => q.context === context);
    }

    // Sort by composite score
    return entries.sort((a, b) => {
      const scoreA = a.successRate * 0.4 + a.avgAgreement * 0.4 + (1 / a.avgLatencyMs) * 0.2;
      const scoreB = b.successRate * 0.4 + b.avgAgreement * 0.4 + (1 / b.avgLatencyMs) * 0.2;
      return scoreB - scoreA;
    });
  }

  /**
   * Save A/B test result
   */
  saveABTest(result: ABTestResult): void {
    const tests = this.loadABTests();
    tests.push(result);

    // Keep only last 100 tests
    if (tests.length > 100) {
      tests.splice(0, tests.length - 100);
    }

    writeFileSync(this.abTestsFile, JSON.stringify(tests, null, 2));
  }

  /**
   * Load A/B test results
   */
  loadABTests(): ABTestResult[] {
    if (!existsSync(this.abTestsFile)) {
      return [];
    }
    const content = readFileSync(this.abTestsFile, 'utf-8');
    return JSON.parse(content) as ABTestResult[];
  }

  /**
   * Get A/B test by ID
   */
  getABTest(testId: string): ABTestResult | undefined {
    const tests = this.loadABTests();
    return tests.find((t) => t.testId === testId);
  }

  /**
   * Clear all stored data
   */
  clearAll(): void {
    if (existsSync(this.comparisonsFile)) {
      writeFileSync(this.comparisonsFile, '[]');
    }
    if (existsSync(this.qualityFile)) {
      writeFileSync(this.qualityFile, '{}');
    }
    if (existsSync(this.abTestsFile)) {
      writeFileSync(this.abTestsFile, '[]');
    }
  }
}

// Singleton instance
let storage: ComparisonStorage | null = null;

export function getComparisonStorage(): ComparisonStorage {
  if (!storage) {
    storage = new ComparisonStorage();
  }
  return storage;
}
