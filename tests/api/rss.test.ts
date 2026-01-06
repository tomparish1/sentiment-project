import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { rssRoutes } from '../../src/api/rssRoutes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

// Mock the config module to avoid file system operations
vi.mock('../../skills/rss-discovery/config.js', () => {
  let mockFeeds: Array<{
    id: string;
    name: string;
    url: string;
    categories: string[];
    enabled: boolean;
    addedDate?: string;
  }> = [];
  let mockCategories = [
    { id: 'tech', name: 'Technology', color: '#10b981' },
    { id: 'ai', name: 'AI', color: '#8b5cf6' },
  ];

  return {
    getFeedConfig: vi.fn(() => ({ feeds: mockFeeds, categories: mockCategories })),
    reloadConfig: vi.fn(),
    addFeed: vi.fn((feed) => {
      const newFeed = { ...feed, addedDate: '2026-01-06' };
      mockFeeds.push(newFeed);
      return newFeed;
    }),
    updateFeed: vi.fn((id, updates) => {
      const index = mockFeeds.findIndex((f) => f.id === id);
      if (index === -1) throw new Error(`Feed with ID '${id}' not found`);
      mockFeeds[index] = { ...mockFeeds[index], ...updates };
      return mockFeeds[index];
    }),
    removeFeed: vi.fn((id) => {
      const index = mockFeeds.findIndex((f) => f.id === id);
      if (index === -1) return false;
      mockFeeds.splice(index, 1);
      return true;
    }),
    getAllFeeds: vi.fn(() => mockFeeds),
    getFeed: vi.fn((id) => mockFeeds.find((f) => f.id === id)),
    setFeedEnabled: vi.fn((id, enabled) => {
      const feed = mockFeeds.find((f) => f.id === id);
      if (!feed) throw new Error(`Feed with ID '${id}' not found`);
      feed.enabled = enabled;
      return feed;
    }),
    addCategory: vi.fn((cat) => {
      mockCategories.push(cat);
      return cat;
    }),
    updateCategory: vi.fn((id, updates) => {
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index === -1) throw new Error(`Category with ID '${id}' not found`);
      mockCategories[index] = { ...mockCategories[index], ...updates };
      return mockCategories[index];
    }),
    removeCategory: vi.fn((id) => {
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index === -1) return false;
      mockCategories.splice(index, 1);
      return true;
    }),
    getAllCategories: vi.fn(() => mockCategories),
    getCategory: vi.fn((id) => mockCategories.find((c) => c.id === id)),
    importConfig: vi.fn((config) => {
      mockFeeds = config.feeds;
      mockCategories = config.categories;
    }),
    exportConfig: vi.fn(() => ({ feeds: mockFeeds, categories: mockCategories })),
    // Reset helper for tests
    __reset: () => {
      mockFeeds = [];
      mockCategories = [
        { id: 'tech', name: 'Technology', color: '#10b981' },
        { id: 'ai', name: 'AI', color: '#8b5cf6' },
      ];
    },
  };
});

// Mock the skill to avoid actual RSS fetching
vi.mock('../../skills/index.js', () => ({
  getSkill: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'item-1',
            title: 'Test Article',
            link: 'https://example.com/article',
            description: 'Test description',
            pubDate: new Date(),
            source: 'Test Feed',
            sourceFeedId: 'test-feed',
            categories: [],
          },
        ],
        errors: [],
        feedCount: 1,
        itemCount: 1,
        lastFetched: new Date(),
      },
      metadata: {
        skillName: 'rss-discovery',
        skillVersion: '1.0.0',
        executionTimeMs: 100,
        timestamp: new Date().toISOString(),
      },
    }),
  })),
}));

import * as configModule from '../../skills/rss-discovery/config.js';

describe('RSS API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/rss', rssRoutes);
    app.use(errorHandler);

    // Reset mock state
    (configModule as unknown as { __reset: () => void }).__reset();
  });

  describe('GET /api/rss/config', () => {
    it('should return full configuration', async () => {
      const response = await request(app).get('/api/rss/config');

      expect(response.status).toBe(200);
      expect(response.body.feeds).toBeInstanceOf(Array);
      expect(response.body.categories).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/rss/sources', () => {
    it('should list all feed sources', async () => {
      const response = await request(app).get('/api/rss/sources');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeDefined();
      expect(response.body.feeds).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/rss/sources', () => {
    it('should add a new feed source', async () => {
      const response = await request(app).post('/api/rss/sources').send({
        id: 'new-feed',
        name: 'New Feed',
        url: 'https://example.com/feed.xml',
        categories: ['tech'],
        enabled: true,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.feed.id).toBe('new-feed');
    });

    it('should reject feed without required fields', async () => {
      const response = await request(app).post('/api/rss/sources').send({
        name: 'Incomplete Feed',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/rss/sources/:id', () => {
    it('should return specific feed', async () => {
      // Add a feed first
      await request(app).post('/api/rss/sources').send({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const response = await request(app).get('/api/rss/sources/test-feed');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-feed');
    });

    it('should return 404 for unknown feed', async () => {
      const response = await request(app).get('/api/rss/sources/unknown');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PATCH /api/rss/sources/:id', () => {
    it('should update a feed', async () => {
      await request(app).post('/api/rss/sources').send({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const response = await request(app)
        .patch('/api/rss/sources/test-feed')
        .send({ name: 'Updated Feed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.feed.name).toBe('Updated Feed');
    });
  });

  describe('DELETE /api/rss/sources/:id', () => {
    it('should remove a feed', async () => {
      await request(app).post('/api/rss/sources').send({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const response = await request(app).delete('/api/rss/sources/test-feed');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for unknown feed', async () => {
      const response = await request(app).delete('/api/rss/sources/unknown');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/rss/sources/:id/enable', () => {
    it('should enable a feed', async () => {
      await request(app).post('/api/rss/sources').send({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: false,
      });

      const response = await request(app).post('/api/rss/sources/test-feed/enable');

      expect(response.status).toBe(200);
      expect(response.body.feed.enabled).toBe(true);
    });
  });

  describe('POST /api/rss/sources/:id/disable', () => {
    it('should disable a feed', async () => {
      await request(app).post('/api/rss/sources').send({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const response = await request(app).post('/api/rss/sources/test-feed/disable');

      expect(response.status).toBe(200);
      expect(response.body.feed.enabled).toBe(false);
    });
  });

  describe('GET /api/rss/categories', () => {
    it('should list all categories', async () => {
      const response = await request(app).get('/api/rss/categories');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.categories).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/rss/categories', () => {
    it('should add a new category', async () => {
      const response = await request(app).post('/api/rss/categories').send({
        id: 'new-cat',
        name: 'New Category',
        color: '#ff0000',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.category.id).toBe('new-cat');
    });

    it('should reject category without required fields', async () => {
      const response = await request(app).post('/api/rss/categories').send({
        name: 'Incomplete',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/rss/feeds', () => {
    it('should fetch aggregated feed items', async () => {
      const response = await request(app).get('/api/rss/feeds');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeInstanceOf(Array);
    });

    it('should accept query parameters', async () => {
      const response = await request(app).get('/api/rss/feeds?maxItems=10&categories=tech');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/rss/feeds/fetch', () => {
    it('should fetch specific URLs', async () => {
      const response = await request(app)
        .post('/api/rss/feeds/fetch')
        .send({ urls: ['https://example.com/feed.xml'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject request without URLs', async () => {
      const response = await request(app).post('/api/rss/feeds/fetch').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('urls');
    });
  });
});
