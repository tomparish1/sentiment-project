import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { skillRoutes } from '../../src/api/skillRoutes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

describe('Skills API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/skills', skillRoutes);
    app.use(errorHandler);
  });

  describe('GET /api/skills', () => {
    it('should list all skills', async () => {
      const response = await request(app).get('/api/skills');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(7);
      expect(response.body.skills).toBeInstanceOf(Array);

      // Check for expected skills
      const skillNames = response.body.skills.map((s: { name: string }) => s.name);
      expect(skillNames).toContain('document-parser');
      expect(skillNames).toContain('document-metadata');
      expect(skillNames).toContain('sentiment-analyzer');
      expect(skillNames).toContain('embedding-engine');
      expect(skillNames).toContain('text-segmenter');
      expect(skillNames).toContain('exemplar-store');
      expect(skillNames).toContain('rhetoric-analyzer');
    });
  });

  describe('GET /api/skills/:name', () => {
    it('should return skill metadata', async () => {
      const response = await request(app).get('/api/skills/text-segmenter');

      expect(response.status).toBe(200);
      expect(response.body.metadata).toMatchObject({
        name: 'text-segmenter',
        version: expect.any(String),
        description: expect.any(String),
        category: 'text-processing',
      });
    });

    it('should return 404 for unknown skill', async () => {
      const response = await request(app).get('/api/skills/unknown-skill');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
      expect(response.body.available).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/skills/:name/invoke', () => {
    it('should invoke text-segmenter skill', async () => {
      const response = await request(app)
        .post('/api/skills/text-segmenter/invoke')
        .send({
          text: 'First sentence here. Second sentence follows. Third one too.',
          method: 'sentence',
          minWords: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.segments).toBeInstanceOf(Array);
      expect(response.body.data.totalSegments).toBeGreaterThan(0);
      expect(response.body.metadata.skillName).toBe('text-segmenter');
    });

    it('should invoke document-metadata skill', async () => {
      const response = await request(app)
        .post('/api/skills/document-metadata/invoke')
        .send({
          text: 'This is a test document with some content to analyze.',
          filename: 'test.txt',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.header).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.wordCount).toBeGreaterThan(0);
    });

    it('should return 404 for unknown skill', async () => {
      const response = await request(app)
        .post('/api/skills/unknown-skill/invoke')
        .send({ text: 'test' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/skills/text-segmenter/invoke')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
