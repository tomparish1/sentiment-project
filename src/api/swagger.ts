import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sentiment Analyzer API',
      version: '0.4.0',
      description: 'A sentiment analysis API powered by Claude AI',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        AnalyzeRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 10000,
              description: 'The text to analyze',
              example: 'I absolutely loved the new restaurant! The service was impeccable.',
            },
            emotions: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'joy',
                  'anger',
                  'sadness',
                  'fear',
                  'surprise',
                  'disgust',
                  'love',
                  'trust',
                  'anticipation',
                  'confusion',
                ],
              },
              description: 'Optional list of emotions to analyze',
              example: ['joy', 'anger', 'sadness'],
            },
          },
        },
        SentimentResult: {
          type: 'object',
          properties: {
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral'],
              description: 'Overall sentiment',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence score',
            },
            indicators: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key emotional indicators',
            },
            explanation: {
              type: 'string',
              description: 'Explanation of the analysis',
            },
            emotions: {
              type: 'object',
              additionalProperties: { type: 'number' },
              description: 'Emotion scores (if requested)',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok'],
            },
            version: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            environment: {
              type: 'string',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'string',
              description: 'Additional error details',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code',
            },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
