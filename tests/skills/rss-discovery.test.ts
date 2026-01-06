import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock state
let mockFeeds: Array<{
  id: string;
  name: string;
  url: string;
  categories: string[];
  enabled: boolean;
  addedDate?: string;
}> = [];

let mockCategories = [
  { id: 'newsletter', name: 'Newsletter', color: '#3b82f6' },
  { id: 'tech', name: 'Technology', color: '#10b981' },
  { id: 'ai', name: 'Artificial Intelligence', color: '#8b5cf6' },
  { id: 'writing', name: 'Writing', color: '#f59e0b' },
  { id: 'culture', name: 'Culture', color: '#ec4899' },
];

const resetMocks = () => {
  mockFeeds = [];
  mockCategories = [
    { id: 'newsletter', name: 'Newsletter', color: '#3b82f6' },
    { id: 'tech', name: 'Technology', color: '#10b981' },
    { id: 'ai', name: 'Artificial Intelligence', color: '#8b5cf6' },
    { id: 'writing', name: 'Writing', color: '#f59e0b' },
    { id: 'culture', name: 'Culture', color: '#ec4899' },
  ];
};

// Mock the config module
vi.mock('../../skills/rss-discovery/config.js', () => ({
  getFeedConfig: () => ({ feeds: mockFeeds, categories: mockCategories }),
  reloadConfig: () => ({ feeds: mockFeeds, categories: mockCategories }),
  addFeed: (feed: any) => {
    if (mockFeeds.some((f) => f.id === feed.id)) {
      throw new Error(`Feed with ID '${feed.id}' already exists`);
    }
    if (mockFeeds.some((f) => f.url === feed.url)) {
      throw new Error(`Feed with URL '${feed.url}' already exists`);
    }
    const newFeed = { ...feed, addedDate: '2026-01-06' };
    mockFeeds.push(newFeed);
    return newFeed;
  },
  updateFeed: (id: string, updates: any) => {
    const index = mockFeeds.findIndex((f) => f.id === id);
    if (index === -1) throw new Error(`Feed with ID '${id}' not found`);
    if (updates.url && mockFeeds.some((f) => f.url === updates.url && f.id !== id)) {
      throw new Error(`Feed with URL '${updates.url}' already exists`);
    }
    mockFeeds[index] = { ...mockFeeds[index], ...updates };
    return mockFeeds[index];
  },
  removeFeed: (id: string) => {
    const index = mockFeeds.findIndex((f) => f.id === id);
    if (index === -1) return false;
    mockFeeds.splice(index, 1);
    return true;
  },
  getAllFeeds: () => mockFeeds,
  getFeed: (id: string) => mockFeeds.find((f) => f.id === id),
  setFeedEnabled: (id: string, enabled: boolean) => {
    const feed = mockFeeds.find((f) => f.id === id);
    if (!feed) throw new Error(`Feed with ID '${id}' not found`);
    feed.enabled = enabled;
    return feed;
  },
  addCategory: (cat: any) => {
    if (mockCategories.some((c) => c.id === cat.id)) {
      throw new Error(`Category with ID '${cat.id}' already exists`);
    }
    mockCategories.push(cat);
    return cat;
  },
  updateCategory: (id: string, updates: any) => {
    const index = mockCategories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Category with ID '${id}' not found`);
    mockCategories[index] = { ...mockCategories[index], ...updates };
    return mockCategories[index];
  },
  removeCategory: (id: string) => {
    const index = mockCategories.findIndex((c) => c.id === id);
    if (index === -1) return false;
    // Clean up feeds
    mockFeeds.forEach((f) => {
      f.categories = f.categories.filter((c) => c !== id);
    });
    mockCategories.splice(index, 1);
    return true;
  },
  getAllCategories: () => mockCategories,
  getCategory: (id: string) => mockCategories.find((c) => c.id === id),
  importConfig: (config: any) => {
    mockFeeds.length = 0;
    mockFeeds.push(...config.feeds);
    mockCategories.length = 0;
    mockCategories.push(...config.categories);
  },
  exportConfig: () => ({ feeds: [...mockFeeds], categories: [...mockCategories] }),
}));

// Import after mocking
import {
  getFeedConfig,
  addFeed,
  updateFeed,
  removeFeed,
  getAllFeeds,
  getFeed,
  setFeedEnabled,
  addCategory,
  updateCategory,
  removeCategory,
  getAllCategories,
  getCategory,
  importConfig,
  exportConfig,
} from '../../skills/rss-discovery/config.js';

describe('RSS Discovery - Config Management', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Feed Management', () => {
    it('should start with empty feeds', () => {
      const feeds = getAllFeeds();
      expect(feeds).toEqual([]);
    });

    it('should add a new feed', () => {
      const feed = addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: ['tech'],
        enabled: true,
      });

      expect(feed.id).toBe('test-feed');
      expect(feed.name).toBe('Test Feed');
      expect(feed.addedDate).toBeDefined();

      const feeds = getAllFeeds();
      expect(feeds).toHaveLength(1);
    });

    it('should reject duplicate feed ID', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      expect(() =>
        addFeed({
          id: 'test-feed',
          name: 'Another Feed',
          url: 'https://example.com/other.xml',
          categories: [],
          enabled: true,
        })
      ).toThrow("Feed with ID 'test-feed' already exists");
    });

    it('should reject duplicate feed URL', () => {
      addFeed({
        id: 'feed-1',
        name: 'Feed 1',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      expect(() =>
        addFeed({
          id: 'feed-2',
          name: 'Feed 2',
          url: 'https://example.com/feed.xml',
          categories: [],
          enabled: true,
        })
      ).toThrow("Feed with URL 'https://example.com/feed.xml' already exists");
    });

    it('should update a feed', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: ['tech'],
        enabled: true,
      });

      const updated = updateFeed('test-feed', { name: 'Updated Feed', enabled: false });

      expect(updated.name).toBe('Updated Feed');
      expect(updated.enabled).toBe(false);
      expect(updated.url).toBe('https://example.com/feed.xml');
    });

    it('should throw when updating non-existent feed', () => {
      expect(() => updateFeed('non-existent', { name: 'Test' })).toThrow(
        "Feed with ID 'non-existent' not found"
      );
    });

    it('should remove a feed', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const removed = removeFeed('test-feed');
      expect(removed).toBe(true);
      expect(getAllFeeds()).toHaveLength(0);
    });

    it('should return false when removing non-existent feed', () => {
      const removed = removeFeed('non-existent');
      expect(removed).toBe(false);
    });

    it('should get a specific feed', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      const feed = getFeed('test-feed');
      expect(feed).toBeDefined();
      expect(feed?.name).toBe('Test Feed');
    });

    it('should enable/disable a feed', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: [],
        enabled: true,
      });

      let feed = setFeedEnabled('test-feed', false);
      expect(feed.enabled).toBe(false);

      feed = setFeedEnabled('test-feed', true);
      expect(feed.enabled).toBe(true);
    });
  });

  describe('Category Management', () => {
    it('should have default categories', () => {
      const categories = getAllCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.map((c) => c.id)).toContain('tech');
      expect(categories.map((c) => c.id)).toContain('ai');
    });

    it('should add a new category', () => {
      const category = addCategory({
        id: 'test-cat',
        name: 'Test Category',
        color: '#ff0000',
      });

      expect(category.id).toBe('test-cat');
      expect(category.color).toBe('#ff0000');
    });

    it('should reject duplicate category ID', () => {
      addCategory({ id: 'custom', name: 'Custom', color: '#000000' });

      expect(() => addCategory({ id: 'custom', name: 'Another', color: '#ffffff' })).toThrow(
        "Category with ID 'custom' already exists"
      );
    });

    it('should update a category', () => {
      addCategory({ id: 'custom', name: 'Custom', color: '#000000' });

      const updated = updateCategory('custom', { name: 'Updated', color: '#ff0000' });

      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#ff0000');
    });

    it('should remove a category and clean up feeds', () => {
      addCategory({ id: 'removable', name: 'Removable', color: '#000000' });
      addFeed({
        id: 'test-feed',
        name: 'Test',
        url: 'https://example.com/feed.xml',
        categories: ['removable', 'tech'],
        enabled: true,
      });

      const removed = removeCategory('removable');
      expect(removed).toBe(true);

      const feed = getFeed('test-feed');
      expect(feed?.categories).not.toContain('removable');
      expect(feed?.categories).toContain('tech');
    });
  });

  describe('Import/Export', () => {
    it('should export and import config', () => {
      addFeed({
        id: 'test-feed',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        categories: ['tech'],
        enabled: true,
      });

      const exported = exportConfig();
      expect(exported.feeds).toHaveLength(1);

      // Clear and reimport
      removeFeed('test-feed');
      expect(getAllFeeds()).toHaveLength(0);

      importConfig(exported);
      expect(getAllFeeds()).toHaveLength(1);
    });
  });
});
