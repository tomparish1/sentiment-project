import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  getAgentNames,
  getAllAgentMetadata,
  getAgent,
  hasAgent,
} from '../../agents/index.js';
import { contentAnalysisAgent } from '../../agents/content-analysis/index.js';
import type { ContentAnalysisInput } from '../../agents/content-analysis/schema.js';
import { researchAnalystAgent } from '../../agents/research-analyst/index.js';
import type { ResearchAnalystInput } from '../../agents/research-analyst/schema.js';
import { isSupportedFile } from '../../skills/document-parser/index.js';

const router = Router();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (isSupportedFile(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: .txt, .md, .pdf, .docx'));
    }
  },
});

/**
 * @openapi
 * /api/agents:
 *   get:
 *     summary: List all available agents
 *     tags:
 *       - Agents
 *     responses:
 *       200:
 *         description: List of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       version:
 *                         type: string
 *                       description:
 *                         type: string
 *                       capabilities:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/', (_req: Request, res: Response) => {
  const metadata = getAllAgentMetadata();
  res.json({
    count: metadata.length,
    agents: metadata,
  });
});

/**
 * @openapi
 * /api/agents/{name}:
 *   get:
 *     summary: Get agent metadata
 *     tags:
 *       - Agents
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent metadata
 *       404:
 *         description: Agent not found
 */
router.get('/:name', (req: Request, res: Response) => {
  const name = req.params['name'];
  if (!name) {
    res.status(400).json({ error: 'Agent name required', statusCode: 400 });
    return;
  }

  if (!hasAgent(name)) {
    res.status(404).json({
      error: `Agent '${name}' not found`,
      available: getAgentNames(),
      statusCode: 404,
    });
    return;
  }

  const agent = getAgent(name);
  res.json({
    metadata: agent?.metadata,
  });
});

/**
 * @openapi
 * /api/agents/content-analysis/execute:
 *   post:
 *     summary: Execute content analysis agent
 *     tags:
 *       - Agents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               filename:
 *                 type: string
 *               exemplarStorePath:
 *                 type: string
 *               emotions:
 *                 type: array
 *                 items:
 *                   type: string
 *               skipRhetoric:
 *                 type: boolean
 *               forceRhetoric:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Analysis error
 */
router.post(
  '/content-analysis/execute',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = {
        text: req.body.text as string | undefined,
        filename: (req.body.filename as string) || 'document.txt',
        mimetype: 'text/plain' as const,
        exemplarStorePath: req.body.exemplarStorePath as string | undefined,
        emotions: req.body.emotions as ContentAnalysisInput['emotions'],
        skipRhetoric: req.body.skipRhetoric === true || req.body.skipRhetoric === 'true',
        forceRhetoric: req.body.forceRhetoric === true || req.body.forceRhetoric === 'true',
        skipSentiment: req.body.skipSentiment === true || req.body.skipSentiment === 'true',
      };

      const result = await contentAnalysisAgent.execute(input);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/agents/content-analysis/execute/file:
 *   post:
 *     summary: Execute content analysis agent on uploaded file
 *     tags:
 *       - Agents
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               emotions:
 *                 type: string
 *                 description: Comma-separated list of emotions
 *               skipRhetoric:
 *                 type: string
 *                 enum: ['true', 'false']
 *               forceRhetoric:
 *                 type: string
 *                 enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Analysis error
 */
router.post(
  '/content-analysis/execute/file',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded', statusCode: 400 });
        return;
      }

      // Parse emotions from form data
      let emotions: ContentAnalysisInput['emotions'] | undefined;
      if (req.body.emotions) {
        emotions = req.body.emotions.split(',').map((e: string) => e.trim()) as ContentAnalysisInput['emotions'];
      }

      const input: ContentAnalysisInput = {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        exemplarStorePath: req.body.exemplarStorePath || 'data/exemplars/starter.json',
        emotions,
        skipRhetoric: req.body.skipRhetoric === 'true',
        forceRhetoric: req.body.forceRhetoric === 'true',
        skipSentiment: req.body.skipSentiment === 'true',
      };

      const result = await contentAnalysisAgent.execute(input);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/agents/research-analyst/execute:
 *   post:
 *     summary: Execute research analyst agent
 *     tags:
 *       - Agents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               filename:
 *                 type: string
 *               exemplarStorePath:
 *                 type: string
 *               emotions:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxSpeakers:
 *                 type: number
 *               includeQuotes:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Research analysis result
 *       400:
 *         description: Analysis error
 */
router.post(
  '/research-analyst/execute',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: ResearchAnalystInput = {
        text: req.body.text as string | undefined,
        filename: (req.body.filename as string) || 'document.txt',
        mimetype: 'text/plain' as const,
        exemplarStorePath: req.body.exemplarStorePath as string | undefined,
        emotions: req.body.emotions as ResearchAnalystInput['emotions'],
        maxSpeakers: typeof req.body.maxSpeakers === 'number' ? req.body.maxSpeakers : 5,
        includeQuotes: req.body.includeQuotes !== false,
      };

      const result = await researchAnalystAgent.execute(input);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/agents/research-analyst/execute/file:
 *   post:
 *     summary: Execute research analyst agent on uploaded file
 *     tags:
 *       - Agents
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               emotions:
 *                 type: string
 *                 description: Comma-separated list of emotions
 *               maxSpeakers:
 *                 type: string
 *               includeQuotes:
 *                 type: string
 *                 enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Research analysis result
 *       400:
 *         description: Analysis error
 */
router.post(
  '/research-analyst/execute/file',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded', statusCode: 400 });
        return;
      }

      // Parse emotions from form data
      let emotions: ResearchAnalystInput['emotions'] | undefined;
      if (req.body.emotions) {
        emotions = req.body.emotions.split(',').map((e: string) => e.trim()) as ResearchAnalystInput['emotions'];
      }

      const input: ResearchAnalystInput = {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        exemplarStorePath: req.body.exemplarStorePath || 'data/exemplars/starter.json',
        emotions,
        maxSpeakers: req.body.maxSpeakers ? parseInt(req.body.maxSpeakers, 10) : 5,
        includeQuotes: req.body.includeQuotes !== 'false',
      };

      const result = await researchAnalystAgent.execute(input);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export { router as agentRoutes };
