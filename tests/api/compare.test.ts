import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { compareRoutes } from '../../src/api/compareRoutes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

// Mock providers
vi.mock('../../src/providers/index.js', () => ({
  getProviderNames: vi.fn(() => ['claude', 'openai', 'ollama']),
  getProviderStatus: vi.fn().mockResolvedValue({
    claude: { available: true },
    openai: { available: false, reason: 'API key not configured' },
    ollama: { available: false, reason: 'Service not running' },
  }),
  getProvider: vi.fn((name) => ({
    metadata: {
      displayName:
        name === 'claude' ? 'Anthropic Claude' : name === 'openai' ? 'OpenAI' : 'Ollama',
    },
    getModels: vi.fn(() => [
      { id: `${name}-model-1`, name: `${name} Model 1` },
      { id: `${name}-model-2`, name: `${name} Model 2` },
    ]),
  })),
}));

// Mock comparison functions
const mockComparisons: Map<string, unknown> = new Map();

vi.mock('../../src/comparison/index.js', () => ({
  runComparison: vi.fn().mockImplementation((messages, options, compOptions) => {
    const comparison = {
      id: `comp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: { messages, options },
      providers: compOptions?.providers || ['claude'],
      results: [
        {
          provider: 'claude',
          model: 'claude-sonnet',
          response: {
            content: 'Test response from Claude',
            latencyMs: 1000,
            usage: { totalTokens: 50 },
          },
          success: true,
        },
      ],
      analysis: {
        agreementScore: 1.0,
        fastestProvider: 'claude',
        differences: [],
      },
      totalTimeMs: 1000,
      context: compOptions?.context,
    };
    mockComparisons.set(comparison.id, comparison);
    return Promise.resolve(comparison);
  }),
  quickCompare: vi.fn().mockImplementation((prompt, systemPrompt) => {
    const comparison = {
      id: `comp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: { messages: [{ role: 'user', content: prompt }] },
      providers: ['claude'],
      results: [
        {
          provider: 'claude',
          model: 'claude-sonnet',
          response: {
            content: 'Quick test response',
            latencyMs: 500,
            usage: { totalTokens: 30 },
          },
          success: true,
        },
      ],
      analysis: {
        agreementScore: 1.0,
        fastestProvider: 'claude',
        differences: [],
      },
      totalTimeMs: 500,
    };
    mockComparisons.set(comparison.id, comparison);
    return Promise.resolve(comparison);
  }),
  compareTwoProviders: vi.fn().mockImplementation((providerA, providerB, messages) => {
    const comparison = {
      id: `comp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: { messages },
      providers: [providerA, providerB],
      results: [
        {
          provider: providerA,
          model: `${providerA}-model`,
          response: { content: `Response from ${providerA}`, latencyMs: 1000 },
          success: true,
        },
        {
          provider: providerB,
          model: `${providerB}-model`,
          response: { content: `Response from ${providerB}`, latencyMs: 1200 },
          success: true,
        },
      ],
      analysis: {
        agreementScore: 0.9,
        fastestProvider: providerA,
        differences: [],
      },
      totalTimeMs: 1200,
    };
    mockComparisons.set(comparison.id, comparison);
    return Promise.resolve(comparison);
  }),
  getComparisonStorage: vi.fn(() => ({
    saveComparison: vi.fn(),
    getRecentComparisons: vi.fn(() => Array.from(mockComparisons.values())),
    getComparisonsByContext: vi.fn((ctx) =>
      Array.from(mockComparisons.values()).filter((c: any) => c.context === ctx)
    ),
    getComparison: vi.fn((id) => mockComparisons.get(id)),
    getProviderQuality: vi.fn(() => []),
    getQualityLeaderboard: vi.fn(() => [
      {
        provider: 'claude',
        context: 'general',
        successRate: 1.0,
        avgLatencyMs: 1000,
        avgAgreement: 1.0,
        sampleSize: 5,
      },
    ]),
  })),
}));

describe('Compare API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/compare', compareRoutes);
    app.use(errorHandler);

    mockComparisons.clear();
  });

  describe('GET /api/compare/providers', () => {
    it('should list all providers', async () => {
      const response = await request(app).get('/api/compare/providers');

      expect(response.status).toBe(200);
      expect(response.body.providers).toBeInstanceOf(Array);
      expect(response.body.availableCount).toBeDefined();
      expect(response.body.totalCount).toBe(3);
    });

    it('should show availability status', async () => {
      const response = await request(app).get('/api/compare/providers');

      const claude = response.body.providers.find((p: any) => p.name === 'claude');
      expect(claude.available).toBe(true);

      const openai = response.body.providers.find((p: any) => p.name === 'openai');
      expect(openai.available).toBe(false);
    });

    it('should include models for each provider', async () => {
      const response = await request(app).get('/api/compare/providers');

      const claude = response.body.providers.find((p: any) => p.name === 'claude');
      expect(claude.models).toBeInstanceOf(Array);
      expect(claude.models.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/compare/quick', () => {
    it('should run quick comparison', async () => {
      const response = await request(app).post('/api/compare/quick').send({
        prompt: 'What is 2+2?',
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.totalTimeMs).toBeDefined();
    });

    it('should accept system prompt', async () => {
      const response = await request(app).post('/api/compare/quick').send({
        prompt: 'Explain recursion',
        systemPrompt: 'You are a programming tutor',
      });

      expect(response.status).toBe(200);
    });

    it('should require prompt', async () => {
      const response = await request(app).post('/api/compare/quick').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('prompt');
    });
  });

  describe('POST /api/compare', () => {
    it('should run full comparison', async () => {
      const response = await request(app).post('/api/compare').send({
        prompt: 'Test prompt',
        maxTokens: 100,
        temperature: 0.5,
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should accept context tag', async () => {
      const response = await request(app).post('/api/compare').send({
        prompt: 'Test prompt',
        context: 'test-context',
      });

      expect(response.status).toBe(200);
    });

    it('should accept provider list', async () => {
      const response = await request(app).post('/api/compare').send({
        prompt: 'Test prompt',
        providers: ['claude'],
      });

      expect(response.status).toBe(200);
    });

    it('should require prompt', async () => {
      const response = await request(app).post('/api/compare').send({
        systemPrompt: 'Just system, no prompt',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/compare/versus', () => {
    it('should compare two providers', async () => {
      const response = await request(app).post('/api/compare/versus').send({
        prompt: 'Test prompt',
        providerA: 'claude',
        providerB: 'openai',
      });

      expect(response.status).toBe(200);
      expect(response.body.providerA).toBeDefined();
      expect(response.body.providerB).toBeDefined();
      expect(response.body.providerA.provider).toBe('claude');
      expect(response.body.providerB.provider).toBe('openai');
    });

    it('should require both providers', async () => {
      const response = await request(app).post('/api/compare/versus').send({
        prompt: 'Test',
        providerA: 'claude',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('providerB');
    });

    it('should require prompt', async () => {
      const response = await request(app).post('/api/compare/versus').send({
        providerA: 'claude',
        providerB: 'openai',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/compare/history', () => {
    it('should return comparison history', async () => {
      // Create a comparison first
      await request(app).post('/api/compare/quick').send({ prompt: 'Test' });

      const response = await request(app).get('/api/compare/history');

      expect(response.status).toBe(200);
      expect(response.body.comparisons).toBeInstanceOf(Array);
    });

    it('should accept limit parameter', async () => {
      const response = await request(app).get('/api/compare/history?limit=5');

      expect(response.status).toBe(200);
    });

    it('should filter by context', async () => {
      const response = await request(app).get('/api/compare/history?context=test');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/compare/history/:id', () => {
    it('should return specific comparison', async () => {
      // Create a comparison
      const createResponse = await request(app).post('/api/compare/quick').send({ prompt: 'Test' });

      const compId = createResponse.body.id;
      const response = await request(app).get(`/api/compare/history/${compId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(compId);
    });

    it('should return 404 for unknown comparison', async () => {
      const response = await request(app).get('/api/compare/history/unknown-id');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/compare/quality', () => {
    it('should return quality metrics', async () => {
      const response = await request(app).get('/api/compare/quality');

      expect(response.status).toBe(200);
      expect(response.body.quality).toBeInstanceOf(Array);
    });

    it('should filter by provider', async () => {
      const response = await request(app).get('/api/compare/quality?provider=claude');

      expect(response.status).toBe(200);
    });

    it('should filter by context', async () => {
      const response = await request(app).get('/api/compare/quality?context=test');

      expect(response.status).toBe(200);
    });
  });
});
