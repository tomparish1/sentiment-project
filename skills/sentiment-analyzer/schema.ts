import { z } from 'zod';

export const EmotionType = z.enum([
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
]);

export type EmotionType = z.infer<typeof EmotionType>;

export const SentimentType = z.enum(['positive', 'negative', 'neutral']);

export type SentimentType = z.infer<typeof SentimentType>;

export const SentimentAnalyzerInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be less than 10000 characters'),
  emotions: z.array(EmotionType).optional().nullable(),
});

export type SentimentAnalyzerInput = z.infer<typeof SentimentAnalyzerInputSchema>;

export type EmotionScores = Record<string, number>;

export const SentimentAnalyzerOutputSchema = z.object({
  sentiment: SentimentType,
  confidence: z.number().min(0).max(1),
  indicators: z.array(z.string()),
  explanation: z.string(),
  emotions: z.record(z.string(), z.number()).optional(),
});

export type SentimentAnalyzerOutput = z.infer<typeof SentimentAnalyzerOutputSchema>;
