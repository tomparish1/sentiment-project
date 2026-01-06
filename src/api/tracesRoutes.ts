/**
 * Context Graph Traces Routes
 *
 * API endpoints for capturing and querying decision traces.
 * Supports source, creation, and editorial trace types.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  createTrace,
  getTrace,
  queryTraces,
  getRecentTraces,
  getSourceTraces,
  getCreationTraces,
  getEditorialTraces,
  getAnalytics,
  searchTraces,
  getRelatedTraces,
  CreateTraceInputSchema,
  TraceQuerySchema,
  type TraceType,
} from '../../skills/context-graph/index.js';

const router = Router();

// ============================================
// Create Traces
// ============================================

/**
 * @openapi
 * /api/traces:
 *   post:
 *     summary: Create a new decision trace
 *     tags:
 *       - Context Graph
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [source, creation, editorial]
 *     responses:
 *       201:
 *         description: Trace created
 *       400:
 *         description: Invalid trace data
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = CreateTraceInputSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid trace data',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        statusCode: 400,
      });
      return;
    }

    const trace = createTrace(validation.data);

    res.status(201).json({
      success: true,
      trace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/traces/source:
 *   post:
 *     summary: Create a source trace (RSS/content discovery decision)
 *     tags:
 *       - Context Graph
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - sourceType
 *               - source
 *               - reason
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [selected, rejected, bookmarked, archived]
 *               sourceType:
 *                 type: string
 *                 enum: [rss, article, paper, video, podcast, other]
 *               source:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   url:
 *                     type: string
 *                   feedName:
 *                     type: string
 *               reason:
 *                 type: string
 *               projectId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Source trace created
 */
router.post('/source', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = {
      type: 'source' as const,
      ...req.body,
    };

    const validation = CreateTraceInputSchema.safeParse(input);

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid source trace data',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        statusCode: 400,
      });
      return;
    }

    const trace = createTrace(validation.data);

    res.status(201).json({
      success: true,
      trace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/traces/creation:
 *   post:
 *     summary: Create a creation trace (LLM output selection decision)
 *     tags:
 *       - Context Graph
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *               - comparison
 *               - selection
 *             properties:
 *               task:
 *                 type: string
 *               comparison:
 *                 type: object
 *                 properties:
 *                   comparisonId:
 *                     type: string
 *                   modelsCompared:
 *                     type: array
 *                     items:
 *                       type: string
 *                   promptUsed:
 *                     type: string
 *               selection:
 *                 type: object
 *                 properties:
 *                   provider:
 *                     type: string
 *                   model:
 *                     type: string
 *                   reason:
 *                     type: string
 *               projectId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Creation trace created
 */
router.post('/creation', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = {
      type: 'creation' as const,
      ...req.body,
    };

    const validation = CreateTraceInputSchema.safeParse(input);

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid creation trace data',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        statusCode: 400,
      });
      return;
    }

    const trace = createTrace(validation.data);

    res.status(201).json({
      success: true,
      trace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/traces/editorial:
 *   post:
 *     summary: Create an editorial trace (writing/editing decision)
 *     tags:
 *       - Context Graph
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *               - category
 *               - reason
 *             properties:
 *               decision:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [structure, voice, cut, addition, framing, tone, clarity, pacing, other]
 *               reason:
 *                 type: string
 *               section:
 *                 type: string
 *               projectId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Editorial trace created
 */
router.post('/editorial', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = {
      type: 'editorial' as const,
      ...req.body,
    };

    const validation = CreateTraceInputSchema.safeParse(input);

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid editorial trace data',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        statusCode: 400,
      });
      return;
    }

    const trace = createTrace(validation.data);

    res.status(201).json({
      success: true,
      trace,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Query Traces
// ============================================

/**
 * @openapi
 * /api/traces:
 *   get:
 *     summary: Query traces with filters
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [source, creation, editorial]
 *       - name: projectId
 *         in: query
 *         schema:
 *           type: string
 *       - name: tags
 *         in: query
 *         description: Comma-separated tags
 *         schema:
 *           type: string
 *       - name: since
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: until
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of traces
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = {
      type: req.query['type'] as TraceType | undefined,
      projectId: req.query['projectId'] as string | undefined,
      tags: req.query['tags'] ? String(req.query['tags']).split(',') : undefined,
      since: req.query['since'] as string | undefined,
      until: req.query['until'] as string | undefined,
      limit: req.query['limit'] ? Number(req.query['limit']) : 50,
      offset: req.query['offset'] ? Number(req.query['offset']) : 0,
    };

    const validation = TraceQuerySchema.safeParse(query);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
        statusCode: 400,
      });
      return;
    }

    const traces = queryTraces(validation.data);

    res.json({
      count: traces.length,
      query: validation.data,
      traces,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/traces/recent:
 *   get:
 *     summary: Get recent traces
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent traces
 */
router.get('/recent', (req: Request, res: Response) => {
  const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
  const traces = getRecentTraces(limit);

  res.json({
    count: traces.length,
    traces,
  });
});

/**
 * @openapi
 * /api/traces/sources:
 *   get:
 *     summary: Get source traces (RSS/content decisions)
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Source traces
 */
router.get('/sources', (req: Request, res: Response) => {
  const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
  const traces = getSourceTraces(limit);

  res.json({
    count: traces.length,
    traces,
  });
});

/**
 * @openapi
 * /api/traces/creations:
 *   get:
 *     summary: Get creation traces (LLM decisions)
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Creation traces
 */
router.get('/creations', (req: Request, res: Response) => {
  const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
  const traces = getCreationTraces(limit);

  res.json({
    count: traces.length,
    traces,
  });
});

/**
 * @openapi
 * /api/traces/editorials:
 *   get:
 *     summary: Get editorial traces (writing decisions)
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Editorial traces
 */
router.get('/editorials', (req: Request, res: Response) => {
  const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
  const traces = getEditorialTraces(limit);

  res.json({
    count: traces.length,
    traces,
  });
});

// ============================================
// Analytics & Search
// ============================================

/**
 * @openapi
 * /api/traces/analytics:
 *   get:
 *     summary: Get trace analytics
 *     tags:
 *       - Context Graph
 *     responses:
 *       200:
 *         description: Analytics summary
 */
router.get('/analytics', (_req: Request, res: Response) => {
  const analytics = getAnalytics();
  res.json(analytics);
});

/**
 * @openapi
 * /api/traces/search:
 *   get:
 *     summary: Search traces by text
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Matching traces
 *       400:
 *         description: Search query required
 */
router.get('/search', (req: Request, res: Response) => {
  const q = req.query['q'] as string;
  if (!q) {
    res.status(400).json({ error: 'Search query (q) is required', statusCode: 400 });
    return;
  }

  const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
  const traces = searchTraces(q, limit);

  res.json({
    query: q,
    count: traces.length,
    traces,
  });
});

// ============================================
// Individual Trace Operations
// ============================================

/**
 * @openapi
 * /api/traces/{id}:
 *   get:
 *     summary: Get a specific trace
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trace details
 *       404:
 *         description: Trace not found
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Trace ID required', statusCode: 400 });
    return;
  }

  const trace = getTrace(id);
  if (!trace) {
    res.status(404).json({ error: `Trace '${id}' not found`, statusCode: 404 });
    return;
  }

  res.json(trace);
});

/**
 * @openapi
 * /api/traces/{id}/related:
 *   get:
 *     summary: Get related traces
 *     tags:
 *       - Context Graph
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Related traces
 *       404:
 *         description: Trace not found
 */
router.get('/:id/related', (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'Trace ID required', statusCode: 400 });
    return;
  }

  const trace = getTrace(id);
  if (!trace) {
    res.status(404).json({ error: `Trace '${id}' not found`, statusCode: 404 });
    return;
  }

  const limit = req.query['limit'] ? Number(req.query['limit']) : 10;
  const related = getRelatedTraces(id, limit);

  res.json({
    traceId: id,
    count: related.length,
    related,
  });
});

export { router as tracesRoutes };
