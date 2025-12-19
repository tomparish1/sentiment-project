import Anthropic from '@anthropic-ai/sdk';
import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  SentimentAnalyzerInputSchema,
  type SentimentAnalyzerInput,
  type SentimentAnalyzerOutput,
  type EmotionType,
} from './schema.js';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1536;

// Lazy-initialized client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function buildSystemPrompt(emotions?: EmotionType[] | null): string {
  let prompt = `You are a sentiment analysis expert. Analyze the given text and provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence score (0-1)
3. Key emotional indicators found in the text
4. Brief explanation of your analysis`;

  if (emotions && emotions.length > 0) {
    prompt += `\n5. Emotion analysis for the following emotions: ${emotions.join(', ')}
   - For each emotion, provide an intensity score from 0-1 (0 = not present, 1 = very strong)`;
  }

  prompt += `\n\nFormat your response as JSON with these fields:
- sentiment: string
- confidence: number
- indicators: array of strings
- explanation: string`;

  if (emotions && emotions.length > 0) {
    prompt += `\n- emotions: object with emotion names as keys and intensity scores (0-1) as values`;
  }

  return prompt;
}

function parseResponse(responseText: string): SentimentAnalyzerOutput {
  // Remove markdown code blocks if present
  const cleanedText = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(cleanedText) as SentimentAnalyzerOutput;
}

export const sentimentAnalyzer: Skill<SentimentAnalyzerInput, SentimentAnalyzerOutput> = {
  metadata: {
    name: 'sentiment-analyzer',
    version: '1.0.0',
    description: 'Analyze text sentiment using Claude API',
    category: 'analysis',
    dependencies: ['@anthropic-ai/sdk'],
  },

  validate(input: SentimentAnalyzerInput) {
    const result = SentimentAnalyzerInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: SentimentAnalyzerInput): Promise<SkillResult<SentimentAnalyzerOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<SentimentAnalyzerOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const anthropic = getClient();
      const systemPrompt = buildSystemPrompt(input.emotions);

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: input.text,
          },
        ],
      });

      const responseText = message.content[0];
      if (responseText?.type !== 'text') {
        return createSkillResult<SentimentAnalyzerOutput>(name, version, startTime, undefined, {
          code: 'UNEXPECTED_RESPONSE',
          message: 'Unexpected response type from Claude',
        });
      }

      const result = parseResponse(responseText.text);

      return createSkillResult(name, version, startTime, result);
    } catch (error) {
      // Check for specific error types
      if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
        return createSkillResult<SentimentAnalyzerOutput>(name, version, startTime, undefined, {
          code: 'CONFIG_ERROR',
          message: error.message,
        });
      }

      return createSkillResult<SentimentAnalyzerOutput>(name, version, startTime, undefined, {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze sentiment',
        details: error,
      });
    }
  },
};

export default sentimentAnalyzer;
