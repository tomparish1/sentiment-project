import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { apiRoutes } from '../../src/api/routes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

// Mock the sentiment service
vi.mock('../../src/services/sentimentService.js', () => ({
  analyzeSentiment: vi.fn(),
}));

import { analyzeSentiment } from '../../src/services/sentimentService.js';

const mockedAnalyzeSentiment = vi.mocked(analyzeSentiment);

describe('API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
    app.use(errorHandler);
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        version: expect.any(String) as string,
        timestamp: expect.any(String) as string,
        environment: 'test',
      });
    });
  });

  describe('POST /api/analyze', () => {
    it('should analyze sentiment successfully', async () => {
      const mockResult = {
        sentiment: 'positive',
        confidence: 0.95,
        indicators: ['loved', 'impeccable'],
        explanation: 'The text expresses positive sentiment.',
      };

      mockedAnalyzeSentiment.mockResolvedValue(mockResult);

      const response = await request(app).post('/api/analyze').send({
        text: 'I loved it!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockedAnalyzeSentiment).toHaveBeenCalledWith('I loved it!', undefined);
    });

    it('should analyze sentiment with emotions', async () => {
      const mockResult = {
        sentiment: 'positive',
        confidence: 0.95,
        indicators: ['loved'],
        explanation: 'Positive sentiment detected.',
        emotions: { joy: 0.9, anger: 0.1 },
      };

      mockedAnalyzeSentiment.mockResolvedValue(mockResult);

      const response = await request(app).post('/api/analyze').send({
        text: 'I loved it!',
        emotions: ['joy', 'anger'],
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockedAnalyzeSentiment).toHaveBeenCalledWith('I loved it!', ['joy', 'anger']);
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app).post('/api/analyze').send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
        statusCode: 400,
      });
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app).post('/api/analyze').send({
        text: '',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
        statusCode: 400,
      });
    });

    it('should return 400 for invalid emotion type', async () => {
      const response = await request(app).post('/api/analyze').send({
        text: 'Hello world',
        emotions: ['invalid_emotion'],
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
        statusCode: 400,
      });
    });
  });
});
