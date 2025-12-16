import type { SentimentResult } from '../types/sentiment.js';

export function parseClaudeResponse(responseText: string): SentimentResult {
  // Remove markdown code blocks if present
  const cleanedText = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(cleanedText) as SentimentResult;
}
