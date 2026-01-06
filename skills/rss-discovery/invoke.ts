import Parser from 'rss-parser';
import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  RSSDiscoveryInputSchema,
  type RSSDiscoveryInput,
  type RSSDiscoveryOutput,
  type FeedItem,
  type FeedError,
  type Feed,
} from './schema.js';
import { getFeedConfig } from './config.js';

// Custom parser with extended fields
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
    ],
  },
});

/**
 * Simple HTML sanitizer - removes script tags and event handlers
 */
function sanitizeHTML(html: string): string {
  if (!html) return '';

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Formats content for better readability by adding paragraph breaks
 */
function formatContent(html: string): string {
  if (!html) return '';

  let formatted = html.trim();

  // Check if content already has block-level HTML elements
  const hasBlockElements = /<(p|div|article|section|h[1-6]|ul|ol|blockquote|pre|figure)\b/i.test(
    formatted
  );

  if (!hasBlockElements) {
    // Content is plain text or inline HTML only
    // Convert double newlines to paragraph breaks
    formatted = formatted.replace(/\n\s*\n/g, '</p><p>');

    // Convert single newlines to line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Wrap in paragraph tags
    formatted = `<p>${formatted}</p>`;
  }

  return formatted;
}

/**
 * Fetch and parse a single RSS feed
 */
async function fetchFeed(feed: Feed, maxItems: number): Promise<FeedItem[]> {
  const response = await fetch(feed.url, {
    headers: {
      'User-Agent': 'Writers-Portal-RSS/1.0',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xmlContent = await response.text();
  const parsedFeed = await parser.parseString(xmlContent);

  // Transform rss-parser output to FeedItem format
  const items = parsedFeed.items.slice(0, maxItems).map((item, index) => {
    // Cast item to access custom fields
    const itemAny = item as unknown as Record<string, unknown>;
    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

    // Use content:encoded if available, otherwise use description
    const rawContent =
      itemAny['contentEncoded'] ||
      item.content ||
      item.summary ||
      item.contentSnippet ||
      '';
    const description = formatContent(sanitizeHTML(String(rawContent)));

    // Get author from various possible fields
    const author = itemAny['dcCreator'] || item.creator || '';

    // Get categories
    const categories = Array.isArray(item.categories)
      ? item.categories
      : item.categories
        ? [item.categories]
        : [];

    // Generate unique ID
    const id = item.guid || itemAny['id'] || `${feed.id}-${index}-${pubDate.getTime()}`;

    return {
      id: String(id),
      title: sanitizeHTML(item.title || 'Untitled'),
      link: item.link || '',
      description,
      pubDate,
      author: sanitizeHTML(String(author)),
      categories: categories.map(String),
      source: feed.name,
      sourceFeedId: feed.id,
    };
  });

  return items;
}

export const rssDiscovery: Skill<RSSDiscoveryInput, RSSDiscoveryOutput> = {
  metadata: {
    name: 'rss-discovery',
    version: '1.0.0',
    description: 'Fetch and aggregate RSS feeds for content discovery',
    category: 'discovery',
    dependencies: ['rss-parser'],
  },

  validate(input: RSSDiscoveryInput) {
    const result = RSSDiscoveryInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: RSSDiscoveryInput): Promise<SkillResult<RSSDiscoveryOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<RSSDiscoveryOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const config = getFeedConfig();
      let feedsToFetch: Feed[] = [];

      if (input.mode === 'specific' && input.feedUrls) {
        // Create temporary Feed objects for specific URLs
        feedsToFetch = input.feedUrls.map((url, idx) => ({
          id: `temp-${idx}`,
          name: url,
          url,
          categories: [],
          enabled: true,
        }));
      } else {
        // Fetch all enabled feeds, optionally filtered by category
        feedsToFetch = config.feeds.filter((feed) => {
          if (!feed.enabled) return false;
          if (input.categories && input.categories.length > 0) {
            return feed.categories.some((cat) => input.categories!.includes(cat));
          }
          return true;
        });
      }

      if (feedsToFetch.length === 0) {
        return createSkillResult(name, version, startTime, {
          items: [],
          errors: [],
          feedCount: 0,
          itemCount: 0,
          lastFetched: new Date(),
        });
      }

      // Fetch all feeds in parallel
      const feedPromises = feedsToFetch.map((feed) =>
        fetchFeed(feed, input.maxItemsPerFeed ?? 50)
          .then((items) => ({ feed, items, error: null }))
          .catch((error) => ({ feed, items: [], error: error as Error }))
      );

      const results = await Promise.all(feedPromises);

      // Separate successful feeds from errors
      const items: FeedItem[] = [];
      const errors: FeedError[] = [];

      for (const result of results) {
        if (result.error) {
          errors.push({
            feedId: result.feed.id,
            feedName: result.feed.name,
            error: result.error.message || 'Unknown error',
          });
        } else {
          items.push(...result.items);
        }
      }

      // Apply date filter if specified
      let filteredItems = items;
      if (input.since) {
        filteredItems = items.filter((item) => item.pubDate >= input.since!);
      }

      // Sort items
      if (input.sortBy === 'date') {
        filteredItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      } else {
        filteredItems.sort((a, b) => a.source.localeCompare(b.source));
      }

      return createSkillResult(name, version, startTime, {
        items: filteredItems,
        errors,
        feedCount: feedsToFetch.length,
        itemCount: filteredItems.length,
        lastFetched: new Date(),
      });
    } catch (error) {
      return createSkillResult<RSSDiscoveryOutput>(name, version, startTime, undefined, {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch feeds',
        details: error,
      });
    }
  },
};

export default rssDiscovery;
