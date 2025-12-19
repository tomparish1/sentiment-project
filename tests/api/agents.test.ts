import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { agentRoutes } from '../../src/api/agentRoutes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

describe('Agents API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentRoutes);
    app.use(errorHandler);
  });

  describe('GET /api/agents', () => {
    it('should list all agents', async () => {
      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.agents).toBeInstanceOf(Array);

      const agentNames = response.body.agents.map((a: { name: string }) => a.name);
      expect(agentNames).toContain('content-analysis');
      expect(agentNames).toContain('research-analyst');
    });
  });

  describe('GET /api/agents/:name', () => {
    it('should return agent metadata', async () => {
      const response = await request(app).get('/api/agents/content-analysis');

      expect(response.status).toBe(200);
      expect(response.body.metadata).toMatchObject({
        name: 'content-analysis',
        version: expect.any(String),
        description: expect.any(String),
        capabilities: expect.any(Array),
        requiredSkills: expect.any(Array),
      });
    });

    it('should return 404 for unknown agent', async () => {
      const response = await request(app).get('/api/agents/unknown-agent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/agents/content-analysis/execute', () => {
    it('should execute content analysis with skipSentiment', async () => {
      const response = await request(app)
        .post('/api/agents/content-analysis/execute')
        .send({
          text: 'This is a test document. It has multiple sentences. The analysis should work.',
          filename: 'test.txt',
          skipSentiment: true,
          skipRhetoric: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.synthesis).toBeDefined();
      expect(response.body.metadata.agentName).toBe('content-analysis');
      expect(response.body.metadata.stepsCompleted).toBeGreaterThan(0);
    });
  });

  describe('POST /api/agents/research-analyst/execute', () => {
    it('should execute research analyst on simple text', async () => {
      const response = await request(app)
        .post('/api/agents/research-analyst/execute')
        .send({
          text: 'This is a simple research document for testing purposes.',
          filename: 'research.txt',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.report).toBeDefined();
      expect(response.body.data.report.title).toContain('research.txt');
      expect(response.body.metadata.agentName).toBe('research-analyst');
    });

    it('should detect speakers in transcript', async () => {
      const transcript = `
HOST: Welcome to our show.
GUEST: Thank you for having me.
HOST: Let's discuss the topic.
GUEST: I have some thoughts on this.
      `.trim();

      const response = await request(app)
        .post('/api/agents/research-analyst/execute')
        .send({
          text: transcript,
          filename: 'transcript.txt',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document.characteristics.isDialogic).toBe(true);
      expect(response.body.data.document.characteristics.speakers).toContain('HOST');
      expect(response.body.data.document.characteristics.speakers).toContain('GUEST');
    });
  });
});
