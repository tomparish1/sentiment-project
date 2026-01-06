import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getSkill } from '../../skills/index.js';
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
} from '../../skills/rss-discovery/index.js';
import type { RSSDiscoveryInput } from '../../skills/rss-discovery/index.js';

const router = Router();

// ============================================
// Feed Fetching (uses RSS Discovery skill)
// ============================================

/**
 * @openapi
 * /api/rss/feeds:
 *   get:
 *     summary: Fetch all enabled RSS feeds
 *     tags:
 *       - RSS
 *     parameters:
 *       - name: categories
 *         in: query
 *         description: Filter by categories (comma-separated)
 *         schema:
 *           type: string
 *       - name: maxItems
 *         in: query
 *         description: Max items per feed
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: sortBy
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [date, source]
 *           default: date
 *     responses:
 *       200:
 *         description: Aggregated feed items
 *       500:
 *         description: Fetch error
 */
router.get('/feeds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skill = getSkill<RSSDiscoveryInput>('rss-discovery');
    if (!skill) {
      res.status(500).json({ error: 'rss-discovery skill not found', statusCode: 500 });
      return;
    }

    const categories = req.query['categories']
      ? String(req.query['categories']).split(',')
      : undefined;

    const input: RSSDiscoveryInput = {
      mode: 'all',
      categories,
      maxItemsPerFeed: req.query['maxItems'] ? Number(req.query['maxItems']) : 50,
      sortBy: (req.query['sortBy'] as 'date' | 'source') || 'date',
    };

    const result = await skill.invoke(input);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/feeds/fetch:
 *   post:
 *     summary: Fetch specific RSS feed URLs
 *     tags:
 *       - RSS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxItemsPerFeed:
 *                 type: integer
 *                 default: 50
 *     responses:
 *       200:
 *         description: Fetched feed items
 *       400:
 *         description: Invalid request
 */
router.post('/feeds/fetch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skill = getSkill<RSSDiscoveryInput>('rss-discovery');
    if (!skill) {
      res.status(500).json({ error: 'rss-discovery skill not found', statusCode: 500 });
      return;
    }

    const { urls, maxItemsPerFeed } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'urls array is required', statusCode: 400 });
      return;
    }

    const input: RSSDiscoveryInput = {
      mode: 'specific',
      feedUrls: urls,
      maxItemsPerFeed: maxItemsPerFeed || 50,
      sortBy: 'date',
    };

    const result = await skill.invoke(input);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// ============================================
// Feed Configuration Management
// ============================================

/**
 * @openapi
 * /api/rss/config:
 *   get:
 *     summary: Get full RSS configuration
 *     tags:
 *       - RSS Config
 *     responses:
 *       200:
 *         description: Feed configuration
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json(getFeedConfig());
});

/**
 * @openapi
 * /api/rss/config:
 *   put:
 *     summary: Import full RSS configuration
 *     tags:
 *       - RSS Config
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration imported
 *       400:
 *         description: Invalid configuration
 */
router.put('/config', (req: Request, res: Response, next: NextFunction) => {
  try {
    importConfig(req.body);
    res.json({ success: true, config: exportConfig() });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/config/export:
 *   get:
 *     summary: Export RSS configuration
 *     tags:
 *       - RSS Config
 *     responses:
 *       200:
 *         description: Exported configuration
 */
router.get('/config/export', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=rss-feeds-config.json');
  res.json(exportConfig());
});

// ============================================
// Individual Feed Management
// ============================================

/**
 * @openapi
 * /api/rss/sources:
 *   get:
 *     summary: List all configured feed sources
 *     tags:
 *       - RSS Sources
 *     responses:
 *       200:
 *         description: List of feeds
 */
router.get('/sources', (_req: Request, res: Response) => {
  res.json({
    count: getAllFeeds().length,
    feeds: getAllFeeds(),
  });
});

/**
 * @openapi
 * /api/rss/sources:
 *   post:
 *     summary: Add a new feed source
 *     tags:
 *       - RSS Sources
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - url
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               enabled:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Feed added
 *       400:
 *         description: Invalid feed or duplicate
 */
router.post('/sources', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, url, categories = [], enabled = true } = req.body;

    if (!id || !name || !url) {
      res.status(400).json({
        error: 'id, name, and url are required',
        statusCode: 400,
      });
      return;
    }

    const feed = addFeed({ id, name, url, categories, enabled });
    res.status(201).json({ success: true, feed });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(400).json({ error: error.message, statusCode: 400 });
      return;
    }
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/sources/{id}:
 *   get:
 *     summary: Get a specific feed source
 *     tags:
 *       - RSS Sources
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feed details
 *       404:
 *         description: Feed not found
 */
router.get('/sources/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Feed ID required', statusCode: 400 });
    return;
  }

  const feed = getFeed(id);
  if (!feed) {
    res.status(404).json({ error: `Feed '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json(feed);
});

/**
 * @openapi
 * /api/rss/sources/{id}:
 *   patch:
 *     summary: Update a feed source
 *     tags:
 *       - RSS Sources
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Feed updated
 *       404:
 *         description: Feed not found
 */
router.patch('/sources/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Feed ID required', statusCode: 400 });
      return;
    }

    const feed = updateFeed(id, req.body);
    res.json({ success: true, feed });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message, statusCode: 404 });
      return;
    }
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/sources/{id}:
 *   delete:
 *     summary: Remove a feed source
 *     tags:
 *       - RSS Sources
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feed removed
 *       404:
 *         description: Feed not found
 */
router.delete('/sources/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Feed ID required', statusCode: 400 });
    return;
  }

  const removed = removeFeed(id);
  if (!removed) {
    res.status(404).json({ error: `Feed '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json({ success: true, message: `Feed '${id}' removed` });
});

/**
 * @openapi
 * /api/rss/sources/{id}/enable:
 *   post:
 *     summary: Enable a feed source
 *     tags:
 *       - RSS Sources
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feed enabled
 *       404:
 *         description: Feed not found
 */
router.post('/sources/:id/enable', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Feed ID required', statusCode: 400 });
      return;
    }

    const feed = setFeedEnabled(id, true);
    res.json({ success: true, feed });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message, statusCode: 404 });
      return;
    }
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/sources/{id}/disable:
 *   post:
 *     summary: Disable a feed source
 *     tags:
 *       - RSS Sources
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feed disabled
 *       404:
 *         description: Feed not found
 */
router.post('/sources/:id/disable', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Feed ID required', statusCode: 400 });
      return;
    }

    const feed = setFeedEnabled(id, false);
    res.json({ success: true, feed });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message, statusCode: 404 });
      return;
    }
    next(error);
  }
});

// ============================================
// Category Management
// ============================================

/**
 * @openapi
 * /api/rss/categories:
 *   get:
 *     summary: List all categories
 *     tags:
 *       - RSS Categories
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', (_req: Request, res: Response) => {
  res.json({
    count: getAllCategories().length,
    categories: getAllCategories(),
  });
});

/**
 * @openapi
 * /api/rss/categories:
 *   post:
 *     summary: Add a new category
 *     tags:
 *       - RSS Categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *                 default: '#3b82f6'
 *     responses:
 *       201:
 *         description: Category added
 *       400:
 *         description: Invalid category or duplicate
 */
router.post('/categories', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, color = '#3b82f6' } = req.body;

    if (!id || !name) {
      res.status(400).json({
        error: 'id and name are required',
        statusCode: 400,
      });
      return;
    }

    const category = addCategory({ id, name, color });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(400).json({ error: error.message, statusCode: 400 });
      return;
    }
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/categories/{id}:
 *   get:
 *     summary: Get a specific category
 *     tags:
 *       - RSS Categories
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/categories/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Category ID required', statusCode: 400 });
    return;
  }

  const category = getCategory(id);
  if (!category) {
    res.status(404).json({ error: `Category '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json(category);
});

/**
 * @openapi
 * /api/rss/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags:
 *       - RSS Categories
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
router.patch('/categories/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Category ID required', statusCode: 400 });
      return;
    }

    const category = updateCategory(id, req.body);
    res.json({ success: true, category });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message, statusCode: 404 });
      return;
    }
    next(error);
  }
});

/**
 * @openapi
 * /api/rss/categories/{id}:
 *   delete:
 *     summary: Remove a category
 *     tags:
 *       - RSS Categories
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category removed
 *       404:
 *         description: Category not found
 */
router.delete('/categories/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Category ID required', statusCode: 400 });
    return;
  }

  const removed = removeCategory(id);
  if (!removed) {
    res.status(404).json({ error: `Category '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json({ success: true, message: `Category '${id}' removed` });
});

export { router as rssRoutes };
