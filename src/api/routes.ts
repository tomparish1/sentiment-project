import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { analyzeSentiment } from '../services/sentimentService.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { z } from 'zod';
import { AnalyzeRequestSchema, EmotionType } from '../types/sentiment.js';
import type { AnalyzeRequest, HealthResponse } from '../types/sentiment.js';
import { config } from '../config/index.js';
import { isSupportedFile, extractText } from '../services/fileParser.js';
import { analyzeDocument } from '../services/documentAnalyzer.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TEXT_LENGTH = 200000; // 200K characters (~50K tokens)

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

const router = Router();

const VERSION = '0.5.0';

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', (req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Analyze sentiment of text
 *     tags:
 *       - Sentiment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *     responses:
 *       200:
 *         description: Sentiment analysis result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentimentResult'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/analyze', validateRequest(AnalyzeRequestSchema), (req, res, next) => {
  const { text, emotions } = req.body as AnalyzeRequest;
  analyzeSentiment(text, emotions)
    .then((result) => {
      res.json(result);
    })
    .catch(next);
});

/**
 * @openapi
 * /api/analyze/file:
 *   post:
 *     summary: Analyze sentiment of uploaded document
 *     tags:
 *       - Sentiment
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
 *                 description: Document to analyze (.txt, .md, .pdf, .docx)
 *               emotions:
 *                 type: string
 *                 description: Comma-separated list of emotions to analyze
 *     responses:
 *       200:
 *         description: Sentiment analysis result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentimentResult'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/analyze/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded', statusCode: 400 });
      return;
    }

    const text = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    if (!text) {
      res.status(400).json({ error: 'File is empty', statusCode: 400 });
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      res.status(400).json({
        error: `File content exceeds ${MAX_TEXT_LENGTH.toLocaleString()} characters`,
        statusCode: 400,
      });
      return;
    }

    // Parse emotions from form data if provided
    let emotions: z.infer<typeof EmotionType>[] | undefined;
    if (req.body.emotions) {
      const emotionList = req.body.emotions.split(',').map((e: string) => e.trim());
      const validEmotions = emotionList.filter((e: string) => EmotionType.safeParse(e).success) as z.infer<typeof EmotionType>[];
      emotions = validEmotions.length > 0 ? validEmotions : undefined;
    }

    const result = await analyzeSentiment(text, emotions);

    // Add document metadata for file uploads
    const documentMetadata = analyzeDocument(text, req.file.originalname);
    result.document = documentMetadata;

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as apiRoutes };
