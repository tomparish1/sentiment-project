/**
 * LLM Comparison Routes
 *
 * Dedicated endpoints for multi-LLM comparison, making the prompt-tester
 * skill more accessible with simpler API patterns.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  runComparison,
  quickCompare,
  compareTwoProviders,
  getComparisonStorage,
} from '../comparison/index.js';
import {
  getProviderNames,
  getProviderStatus,
  getProvider,
  type ProviderName,
  type Message,
} from '../providers/index.js';

const router = Router();

// ============================================
// Provider Information
// ============================================

/**
 * @openapi
 * /api/compare/providers:
 *   get:
 *     summary: List all LLM providers and their availability
 *     tags:
 *       - LLM Comparison
 *     parameters:
 *       - name: checkAvailability
 *         in: query
 *         description: Actually check if providers are reachable
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: List of providers
 */
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkAvailability = req.query['checkAvailability'] !== 'false';
    const names = getProviderNames();
    const status = checkAvailability
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

    res.json({
      providers,
      availableCount: providers.filter((p) => p.available).length,
      totalCount: providers.length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Quick Comparison
// ============================================

/**
 * @openapi
 * /api/compare/quick:
 *   post:
 *     summary: Quick comparison across all available providers
 *     tags:
 *       - LLM Comparison
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comparison results
 *       400:
 *         description: Invalid request
 */
router.post('/quick', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required', statusCode: 400 });
      return;
    }

    const comparison = await quickCompare(prompt, systemPrompt);

    // Save for history
    const storage = getComparisonStorage();
    storage.saveComparison(comparison);

    res.json({
      id: comparison.id,
      prompt,
      results: comparison.results.map((r) => ({
        provider: r.provider,
        model: r.model,
        content: r.response.content,
        latencyMs: r.response.latencyMs,
        tokens: r.response.usage?.totalTokens,
        success: r.success,
        error: r.error,
      })),
      analysis: comparison.analysis,
      totalTimeMs: comparison.totalTimeMs,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Full Comparison
// ============================================

/**
 * @openapi
 * /api/compare:
 *   post:
 *     summary: Compare prompt across specified providers
 *     tags:
 *       - LLM Comparison
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               providers:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [claude, openai, gemini, ollama]
 *               maxTokens:
 *                 type: integer
 *                 default: 1024
 *               temperature:
 *                 type: number
 *                 default: 0.7
 *               context:
 *                 type: string
 *                 description: Context tag for organizing comparisons
 *               parallel:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Comparison results
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      prompt,
      systemPrompt,
      providers,
      maxTokens = 1024,
      temperature = 0.7,
      context,
      parallel = true,
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required', statusCode: 400 });
      return;
    }

    // Build messages
    const messages: Message[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const comparison = await runComparison(
      messages,
      { maxTokens, temperature },
      {
        providers: providers as ProviderName[] | undefined,
        context,
        parallel,
      }
    );

    // Save for history
    const storage = getComparisonStorage();
    storage.saveComparison(comparison);

    res.json({
      id: comparison.id,
      prompt,
      systemPrompt,
      providers: comparison.providers,
      results: comparison.results.map((r) => ({
        provider: r.provider,
        model: r.model,
        content: r.response.content,
        latencyMs: r.response.latencyMs,
        tokens: r.response.usage?.totalTokens,
        success: r.success,
        error: r.error,
      })),
      analysis: comparison.analysis,
      totalTimeMs: comparison.totalTimeMs,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Head-to-Head Comparison
// ============================================

/**
 * @openapi
 * /api/compare/versus:
 *   post:
 *     summary: Compare two specific providers head-to-head
 *     tags:
 *       - LLM Comparison
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - providerA
 *               - providerB
 *             properties:
 *               prompt:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               providerA:
 *                 type: string
 *                 enum: [claude, openai, gemini, ollama]
 *               providerB:
 *                 type: string
 *                 enum: [claude, openai, gemini, ollama]
 *               maxTokens:
 *                 type: integer
 *               temperature:
 *                 type: number
 *     responses:
 *       200:
 *         description: Head-to-head comparison
 */
router.post('/versus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, systemPrompt, providerA, providerB, maxTokens, temperature } = req.body;

    if (!prompt || !providerA || !providerB) {
      res.status(400).json({
        error: 'prompt, providerA, and providerB are required',
        statusCode: 400,
      });
      return;
    }

    // Build messages
    const messages: Message[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const comparison = await compareTwoProviders(
      providerA as ProviderName,
      providerB as ProviderName,
      messages,
      { maxTokens, temperature }
    );

    // Save for history
    const storage = getComparisonStorage();
    storage.saveComparison(comparison);

    const resultA = comparison.results.find((r) => r.provider === providerA);
    const resultB = comparison.results.find((r) => r.provider === providerB);

    res.json({
      id: comparison.id,
      prompt,
      providerA: {
        provider: providerA,
        model: resultA?.model,
        content: resultA?.response.content,
        latencyMs: resultA?.response.latencyMs,
        tokens: resultA?.response.usage?.totalTokens,
        success: resultA?.success,
        error: resultA?.error,
      },
      providerB: {
        provider: providerB,
        model: resultB?.model,
        content: resultB?.response.content,
        latencyMs: resultB?.response.latencyMs,
        tokens: resultB?.response.usage?.totalTokens,
        success: resultB?.success,
        error: resultB?.error,
      },
      analysis: comparison.analysis,
      totalTimeMs: comparison.totalTimeMs,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Comparison History
// ============================================

/**
 * @openapi
 * /api/compare/history:
 *   get:
 *     summary: Get comparison history
 *     tags:
 *       - LLM Comparison
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: context
 *         in: query
 *         description: Filter by context tag
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comparison history
 */
router.get('/history', (_req: Request, res: Response) => {
  const limit = Number(_req.query['limit']) || 20;
  const context = _req.query['context'] as string | undefined;

  const storage = getComparisonStorage();
  let comparisons = context
    ? storage.getComparisonsByContext(context)
    : storage.getRecentComparisons(limit);

  comparisons = comparisons.slice(0, limit);

  res.json({
    count: comparisons.length,
    comparisons: comparisons.map((c) => ({
      id: c.id,
      timestamp: c.timestamp,
      context: c.context,
      providers: c.providers,
      agreementScore: c.analysis.agreementScore,
      totalTimeMs: c.totalTimeMs,
    })),
  });
});

/**
 * @openapi
 * /api/compare/history/{id}:
 *   get:
 *     summary: Get a specific comparison by ID
 *     tags:
 *       - LLM Comparison
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comparison details
 *       404:
 *         description: Comparison not found
 */
router.get('/history/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Comparison ID required', statusCode: 400 });
    return;
  }

  const storage = getComparisonStorage();
  const comparison = storage.getComparison(id);

  if (!comparison) {
    res.status(404).json({ error: `Comparison '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json({
    id: comparison.id,
    timestamp: comparison.timestamp,
    context: comparison.context,
    input: comparison.input,
    providers: comparison.providers,
    results: comparison.results.map((r) => ({
      provider: r.provider,
      model: r.model,
      content: r.response.content,
      latencyMs: r.response.latencyMs,
      tokens: r.response.usage?.totalTokens,
      success: r.success,
      error: r.error,
    })),
    analysis: comparison.analysis,
    totalTimeMs: comparison.totalTimeMs,
  });
});

// ============================================
// Quality Metrics
// ============================================

/**
 * @openapi
 * /api/compare/quality:
 *   get:
 *     summary: Get provider quality metrics
 *     tags:
 *       - LLM Comparison
 *     parameters:
 *       - name: provider
 *         in: query
 *         description: Filter by provider
 *         schema:
 *           type: string
 *       - name: context
 *         in: query
 *         description: Filter by context
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quality metrics
 */
router.get('/quality', (req: Request, res: Response) => {
  const provider = req.query['provider'] as ProviderName | undefined;
  const context = req.query['context'] as string | undefined;

  const storage = getComparisonStorage();
  const entries = provider
    ? storage.getProviderQuality(provider)
    : storage.getQualityLeaderboard(context);

  res.json({
    quality: entries.map((e) => ({
      provider: e.provider,
      context: e.context,
      successRate: e.successRate,
      avgLatencyMs: e.avgLatencyMs,
      avgAgreement: e.avgAgreement,
      sampleSize: e.sampleSize,
    })),
  });
});

export { router as compareRoutes };
