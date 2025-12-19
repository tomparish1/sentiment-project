import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  getSkillNames,
  getAllSkillMetadata,
  getSkill,
  hasSkill,
} from '../../skills/index.js';
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
 * /api/skills:
 *   get:
 *     summary: List all available skills
 *     tags:
 *       - Skills
 *     responses:
 *       200:
 *         description: List of skills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 skills:
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
 *                       category:
 *                         type: string
 */
router.get('/', (_req: Request, res: Response) => {
  const metadata = getAllSkillMetadata();
  res.json({
    count: metadata.length,
    skills: metadata,
  });
});

/**
 * @openapi
 * /api/skills/{name}:
 *   get:
 *     summary: Get skill metadata
 *     tags:
 *       - Skills
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill metadata
 *       404:
 *         description: Skill not found
 */
router.get('/:name', (req: Request, res: Response) => {
  const name = req.params['name'];
  if (!name) {
    res.status(400).json({ error: 'Skill name required', statusCode: 400 });
    return;
  }

  if (!hasSkill(name)) {
    res.status(404).json({
      error: `Skill '${name}' not found`,
      available: getSkillNames(),
      statusCode: 404,
    });
    return;
  }

  const skill = getSkill(name);
  res.json({
    metadata: skill?.metadata,
  });
});

/**
 * @openapi
 * /api/skills/{name}/invoke:
 *   post:
 *     summary: Invoke a skill
 *     tags:
 *       - Skills
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Skill result
 *       400:
 *         description: Validation error
 *       404:
 *         description: Skill not found
 */
router.post('/:name/invoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params['name'];
    if (!name) {
      res.status(400).json({ error: 'Skill name required', statusCode: 400 });
      return;
    }

    if (!hasSkill(name)) {
      res.status(404).json({
        error: `Skill '${name}' not found`,
        available: getSkillNames(),
        statusCode: 404,
      });
      return;
    }

    const skill = getSkill(name);
    if (!skill) {
      res.status(404).json({
        error: `Skill '${name}' not found`,
        statusCode: 404,
      });
      return;
    }

    const result = await skill.invoke(req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/skills/document-parser/invoke:
 *   post:
 *     summary: Parse an uploaded document
 *     tags:
 *       - Skills
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
 *     responses:
 *       200:
 *         description: Parsed document text
 *       400:
 *         description: Parse error
 */
router.post(
  '/document-parser/invoke/file',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded', statusCode: 400 });
        return;
      }

      const skill = getSkill('document-parser');
      if (!skill) {
        res.status(500).json({ error: 'document-parser skill not found', statusCode: 500 });
        return;
      }

      const result = await skill.invoke({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/skills/rhetoric-analyzer/analyze:
 *   post:
 *     summary: Analyze rhetoric in text
 *     tags:
 *       - Skills
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
 *               exemplarStorePath:
 *                 type: string
 *               segmentationMethod:
 *                 type: string
 *                 enum: [sentence, paragraph, sliding, speaker_turn]
 *               confidenceThreshold:
 *                 type: number
 *     responses:
 *       200:
 *         description: Rhetoric analysis result
 *       400:
 *         description: Analysis error
 */
router.post('/rhetoric-analyzer/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skill = getSkill('rhetoric-analyzer');
    if (!skill) {
      res.status(500).json({ error: 'rhetoric-analyzer skill not found', statusCode: 500 });
      return;
    }

    const input = {
      text: req.body.text,
      exemplarStorePath: req.body.exemplarStorePath || 'data/exemplars/starter.json',
      inputFile: req.body.inputFile || '<api>',
      segmentationMethod: req.body.segmentationMethod || 'sentence',
      confidenceThreshold: req.body.confidenceThreshold || 0.5,
      topK: req.body.topK || 5,
    };

    const result = await skill.invoke(input);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

export { router as skillRoutes };
