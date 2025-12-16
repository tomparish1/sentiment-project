import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { parseClaudeResponse } from '../utils/parseResponse.js';
import type { SentimentResult, EmotionType } from '../types/sentiment.js';

const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1536;

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

export async function analyzeSentiment(
  text: string,
  emotions?: EmotionType[] | null
): Promise<SentimentResult> {
  logger.info({ textLength: text.length, emotions }, 'Analyzing sentiment');

  const systemPrompt = buildSystemPrompt(emotions);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const responseText = message.content[0];
  if (responseText?.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const result = parseClaudeResponse(responseText.text);

  logger.info(
    { sentiment: result.sentiment, confidence: result.confidence },
    'Sentiment analysis complete'
  );

  return result;
}
