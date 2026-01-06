/**
 * RSS Feed Configuration Management
 *
 * Handles feed and category configuration with persistence to JSON file.
 * This replaces the in-memory + Cloudflare approach from the standalone RSS tool.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { FeedConfig, Feed, Category } from './schema.js';
import { FeedConfigSchema } from './schema.js';

// Config file location - stored in Portal's data directory
const DATA_DIR = join(process.cwd(), 'data');
const CONFIG_FILE = join(DATA_DIR, 'rss-feeds.json');

// Default configuration
const DEFAULT_CONFIG: FeedConfig = {
  feeds: [],
  categories: [
    { id: 'newsletter', name: 'Newsletter', color: '#3b82f6' },
    { id: 'tech', name: 'Technology', color: '#10b981' },
    { id: 'ai', name: 'Artificial Intelligence', color: '#8b5cf6' },
    { id: 'writing', name: 'Writing', color: '#f59e0b' },
    { id: 'culture', name: 'Culture', color: '#ec4899' },
  ],
};

// In-memory cache of config
let configCache: FeedConfig | null = null;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load configuration from disk
 */
function loadConfig(): FeedConfig {
  ensureDataDir();

  if (!existsSync(CONFIG_FILE)) {
    // Write default config if file doesn't exist
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }

  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const validated = FeedConfigSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Error loading RSS config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to disk
 */
function saveConfig(config: FeedConfig): void {
  ensureDataDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  configCache = config;
}

/**
 * Get current feed configuration (cached)
 */
export function getFeedConfig(): FeedConfig {
  if (!configCache) {
    configCache = loadConfig();
  }
  return configCache;
}

/**
 * Reload configuration from disk (clears cache)
 */
export function reloadConfig(): FeedConfig {
  configCache = null;
  return getFeedConfig();
}

// ============================================
// Feed Management
// ============================================

/**
 * Add a new feed
 */
export function addFeed(feed: Omit<Feed, 'addedDate'>): Feed {
  const config = getFeedConfig();

  // Check for duplicate ID or URL
  if (config.feeds.some((f) => f.id === feed.id)) {
    throw new Error(`Feed with ID '${feed.id}' already exists`);
  }
  if (config.feeds.some((f) => f.url === feed.url)) {
    throw new Error(`Feed with URL '${feed.url}' already exists`);
  }

  const newFeed: Feed = {
    ...feed,
    addedDate: new Date().toISOString().split('T')[0],
  };

  config.feeds.push(newFeed);
  saveConfig(config);
  return newFeed;
}

/**
 * Update an existing feed
 */
export function updateFeed(id: string, updates: Partial<Omit<Feed, 'id'>>): Feed {
  const config = getFeedConfig();
  const index = config.feeds.findIndex((f) => f.id === id);

  if (index === -1) {
    throw new Error(`Feed with ID '${id}' not found`);
  }

  // Check URL uniqueness if URL is being updated
  if (updates.url && config.feeds.some((f) => f.url === updates.url && f.id !== id)) {
    throw new Error(`Feed with URL '${updates.url}' already exists`);
  }

  const updatedFeed: Feed = { ...config.feeds[index], ...updates } as Feed;
  config.feeds[index] = updatedFeed;
  saveConfig(config);
  return updatedFeed;
}

/**
 * Remove a feed
 */
export function removeFeed(id: string): boolean {
  const config = getFeedConfig();
  const index = config.feeds.findIndex((f) => f.id === id);

  if (index === -1) {
    return false;
  }

  config.feeds.splice(index, 1);
  saveConfig(config);
  return true;
}

/**
 * Get a feed by ID
 */
export function getFeed(id: string): Feed | undefined {
  return getFeedConfig().feeds.find((f) => f.id === id);
}

/**
 * Get all feeds
 */
export function getAllFeeds(): Feed[] {
  return getFeedConfig().feeds;
}

/**
 * Enable/disable a feed
 */
export function setFeedEnabled(id: string, enabled: boolean): Feed {
  return updateFeed(id, { enabled });
}

// ============================================
// Category Management
// ============================================

/**
 * Add a new category
 */
export function addCategory(category: Category): Category {
  const config = getFeedConfig();

  if (config.categories.some((c) => c.id === category.id)) {
    throw new Error(`Category with ID '${category.id}' already exists`);
  }

  config.categories.push(category);
  saveConfig(config);
  return category;
}

/**
 * Update an existing category
 */
export function updateCategory(id: string, updates: Partial<Omit<Category, 'id'>>): Category {
  const config = getFeedConfig();
  const index = config.categories.findIndex((c) => c.id === id);

  if (index === -1) {
    throw new Error(`Category with ID '${id}' not found`);
  }

  const updatedCategory: Category = { ...config.categories[index], ...updates } as Category;
  config.categories[index] = updatedCategory;
  saveConfig(config);
  return updatedCategory;
}

/**
 * Remove a category
 */
export function removeCategory(id: string): boolean {
  const config = getFeedConfig();
  const index = config.categories.findIndex((c) => c.id === id);

  if (index === -1) {
    return false;
  }

  // Remove category from all feeds that use it
  for (const feed of config.feeds) {
    feed.categories = feed.categories.filter((cat) => cat !== id);
  }

  config.categories.splice(index, 1);
  saveConfig(config);
  return true;
}

/**
 * Get all categories
 */
export function getAllCategories(): Category[] {
  return getFeedConfig().categories;
}

/**
 * Get a category by ID
 */
export function getCategory(id: string): Category | undefined {
  return getFeedConfig().categories.find((c) => c.id === id);
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Import configuration (replaces existing)
 */
export function importConfig(config: FeedConfig): void {
  const validated = FeedConfigSchema.parse(config);
  saveConfig(validated);
}

/**
 * Export current configuration
 */
export function exportConfig(): FeedConfig {
  return getFeedConfig();
}
