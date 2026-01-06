import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { tracesRoutes } from '../../src/api/tracesRoutes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

// Mock storage
const mockTraces: Map<string, unknown> = new Map();
let mockIdCounter = 0;

vi.mock('../../skills/context-graph/index.js', () => ({
  CreateTraceInputSchema: {
    safeParse: vi.fn((data) => {
      if (!data.type) {
        return { success: false, error: { errors: [{ path: ['type'], message: 'Required' }] } };
      }
      if (data.type === 'source' && !data.reason) {
        return { success: false, error: { errors: [{ path: ['reason'], message: 'Required' }] } };
      }
      return { success: true, data };
    }),
  },
  TraceQuerySchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  createTrace: vi.fn((input) => {
    const trace = {
      ...input,
      id: `trace-${++mockIdCounter}`,
      timestamp: new Date().toISOString(),
      tags: input.tags || [],
    };
    mockTraces.set(trace.id, trace);
    return trace;
  }),
  getTrace: vi.fn((id) => mockTraces.get(id)),
  queryTraces: vi.fn((query) => {
    let results = Array.from(mockTraces.values());
    if (query.type) {
      results = results.filter((t: any) => t.type === query.type);
    }
    if (query.projectId) {
      results = results.filter((t: any) => t.projectId === query.projectId);
    }
    return results.slice(0, query.limit || 50);
  }),
  getRecentTraces: vi.fn((limit) => Array.from(mockTraces.values()).slice(0, limit)),
  getSourceTraces: vi.fn((limit) =>
    Array.from(mockTraces.values())
      .filter((t: any) => t.type === 'source')
      .slice(0, limit)
  ),
  getCreationTraces: vi.fn((limit) =>
    Array.from(mockTraces.values())
      .filter((t: any) => t.type === 'creation')
      .slice(0, limit)
  ),
  getEditorialTraces: vi.fn((limit) =>
    Array.from(mockTraces.values())
      .filter((t: any) => t.type === 'editorial')
      .slice(0, limit)
  ),
  getAnalytics: vi.fn(() => ({
    totalTraces: mockTraces.size,
    byType: { source: 1, creation: 1, editorial: 0 },
    byProject: [],
    recentActivity: [],
    topTags: [],
  })),
  searchTraces: vi.fn((q) =>
    Array.from(mockTraces.values()).filter(
      (t: any) => t.reason?.toLowerCase().includes(q.toLowerCase()) || false
    )
  ),
  getRelatedTraces: vi.fn(() => []),
}));

describe('Traces API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/traces', tracesRoutes);
    app.use(errorHandler);

    mockTraces.clear();
    mockIdCounter = 0;
  });

  describe('POST /api/traces', () => {
    it('should create a trace', async () => {
      const response = await request(app).post('/api/traces').send({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test Article' },
        reason: 'Good content',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.trace.id).toBeDefined();
      expect(response.body.trace.type).toBe('source');
    });

    it('should reject invalid trace', async () => {
      const response = await request(app).post('/api/traces').send({
        // missing type
        reason: 'Test',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('POST /api/traces/source', () => {
    it('should create a source trace', async () => {
      const response = await request(app).post('/api/traces/source').send({
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Good article',
      });

      expect(response.status).toBe(201);
      expect(response.body.trace.type).toBe('source');
    });
  });

  describe('POST /api/traces/creation', () => {
    it('should create a creation trace', async () => {
      const response = await request(app).post('/api/traces/creation').send({
        task: 'Write intro',
        comparison: { modelsCompared: ['claude'], promptUsed: 'test' },
        selection: { provider: 'claude', model: 'sonnet', reason: 'Best output' },
      });

      expect(response.status).toBe(201);
      expect(response.body.trace.type).toBe('creation');
    });
  });

  describe('POST /api/traces/editorial', () => {
    it('should create an editorial trace', async () => {
      const response = await request(app).post('/api/traces/editorial').send({
        decision: 'Cut introduction',
        category: 'cut',
        reason: 'Too long',
      });

      expect(response.status).toBe(201);
      expect(response.body.trace.type).toBe('editorial');
    });
  });

  describe('GET /api/traces', () => {
    it('should query traces', async () => {
      // Create some traces first
      await request(app).post('/api/traces/source').send({
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
      });

      const response = await request(app).get('/api/traces');

      expect(response.status).toBe(200);
      expect(response.body.traces).toBeInstanceOf(Array);
    });

    it('should filter by type', async () => {
      const response = await request(app).get('/api/traces?type=source');

      expect(response.status).toBe(200);
      expect(response.body.query.type).toBe('source');
    });

    it('should filter by project', async () => {
      const response = await request(app).get('/api/traces?projectId=test-project');

      expect(response.status).toBe(200);
      expect(response.body.query.projectId).toBe('test-project');
    });
  });

  describe('GET /api/traces/recent', () => {
    it('should return recent traces', async () => {
      const response = await request(app).get('/api/traces/recent');

      expect(response.status).toBe(200);
      expect(response.body.traces).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app).get('/api/traces/recent?limit=5');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/traces/sources', () => {
    it('should return source traces', async () => {
      const response = await request(app).get('/api/traces/sources');

      expect(response.status).toBe(200);
      expect(response.body.traces).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/traces/creations', () => {
    it('should return creation traces', async () => {
      const response = await request(app).get('/api/traces/creations');

      expect(response.status).toBe(200);
      expect(response.body.traces).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/traces/editorials', () => {
    it('should return editorial traces', async () => {
      const response = await request(app).get('/api/traces/editorials');

      expect(response.status).toBe(200);
      expect(response.body.traces).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/traces/analytics', () => {
    it('should return analytics', async () => {
      const response = await request(app).get('/api/traces/analytics');

      expect(response.status).toBe(200);
      expect(response.body.totalTraces).toBeDefined();
      expect(response.body.byType).toBeDefined();
    });
  });

  describe('GET /api/traces/search', () => {
    it('should search traces', async () => {
      const response = await request(app).get('/api/traces/search?q=test');

      expect(response.status).toBe(200);
      expect(response.body.query).toBe('test');
      expect(response.body.traces).toBeInstanceOf(Array);
    });

    it('should require search query', async () => {
      const response = await request(app).get('/api/traces/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/traces/:id', () => {
    it('should return specific trace', async () => {
      // Create a trace first
      const createResponse = await request(app).post('/api/traces/source').send({
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
      });

      const traceId = createResponse.body.trace.id;
      const response = await request(app).get(`/api/traces/${traceId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(traceId);
    });

    it('should return 404 for unknown trace', async () => {
      const response = await request(app).get('/api/traces/unknown-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/traces/:id/related', () => {
    it('should return related traces', async () => {
      const createResponse = await request(app).post('/api/traces/source').send({
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
      });

      const traceId = createResponse.body.trace.id;
      const response = await request(app).get(`/api/traces/${traceId}/related`);

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBe(traceId);
      expect(response.body.related).toBeInstanceOf(Array);
    });

    it('should return 404 for unknown trace', async () => {
      const response = await request(app).get('/api/traces/unknown-id/related');

      expect(response.status).toBe(404);
    });
  });
});
