import { z } from 'zod';

/**
 * Feed configuration for RSS sources
 */
export const FeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  categories: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  addedDate: z.string().optional(),
});

export type Feed = z.infer<typeof FeedSchema>;

/**
 * Category for organizing feeds
 */
export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
});

export type Category = z.infer<typeof CategorySchema>;

/**
 * Full feed configuration
 */
export const FeedConfigSchema = z.object({
  feeds: z.array(FeedSchema),
  categories: z.array(CategorySchema),
});

export type FeedConfig = z.infer<typeof FeedConfigSchema>;

/**
 * Individual feed item from RSS
 */
export const FeedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string(),
  description: z.string(),
  pubDate: z.date(),
  author: z.string().optional(),
  categories: z.array(z.string()),
  source: z.string(),
  sourceFeedId: z.string(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

/**
 * Item state for tracking read/favorite/archived
 */
export const ItemStateSchema = z.object({
  id: z.string(),
  read: z.boolean().default(false),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  readAt: z.date().optional(),
});

export type ItemState = z.infer<typeof ItemStateSchema>;

/**
 * RSS Discovery skill input
 */
export const RSSDiscoveryInputSchema = z.object({
  // Fetch mode: 'all' fetches all enabled feeds, 'specific' fetches only specified URLs
  mode: z.enum(['all', 'specific']).default('all'),

  // For 'specific' mode - URLs to fetch
  feedUrls: z.array(z.string().url()).optional(),

  // Filter by categories (optional)
  categories: z.array(z.string()).optional(),

  // Maximum items per feed
  maxItemsPerFeed: z.number().min(1).max(100).default(50),

  // Sort by date (newest first by default)
  sortBy: z.enum(['date', 'source']).default('date'),

  // Filter by date range (optional)
  since: z.date().optional(),
});

export type RSSDiscoveryInput = z.infer<typeof RSSDiscoveryInputSchema>;

/**
 * Feed error details
 */
export const FeedErrorSchema = z.object({
  feedId: z.string(),
  feedName: z.string(),
  error: z.string(),
});

export type FeedError = z.infer<typeof FeedErrorSchema>;

/**
 * RSS Discovery skill output
 */
export const RSSDiscoveryOutputSchema = z.object({
  items: z.array(FeedItemSchema),
  errors: z.array(FeedErrorSchema),
  feedCount: z.number(),
  itemCount: z.number(),
  lastFetched: z.date(),
});

export type RSSDiscoveryOutput = z.infer<typeof RSSDiscoveryOutputSchema>;
