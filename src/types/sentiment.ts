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

export const AnalyzeRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be less than 10000 characters'),
  emotions: z.array(EmotionType).optional().nullable(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type EmotionScores = Record<string, number>;

export interface DocumentHeader {
  title: string;
  authors: string[];
  sourceFile: string;
  analysisDate: string;
  analysisTimestamp: string;
}

export interface DocumentStatistics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  characterCount: number;
  estimatedReadingTimeMinutes: number;
}

export interface GenreMarker {
  genre: string;
  score: number;
}

export interface DocumentCharacteristics {
  genreMarkers: GenreMarker[];
  formalityScore: number;
  isDialogic: boolean;
  speakers: string[];
}

export interface DocumentMetadata {
  header: DocumentHeader;
  statistics: DocumentStatistics;
  characteristics: DocumentCharacteristics;
}

export interface SentimentResult {
  sentiment: string;
  confidence: number;
  indicators: string[];
  explanation: string;
  emotions?: EmotionScores;
  document?: DocumentMetadata;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  timestamp: string;
  environment: string;
}

export interface ErrorResponse {
  error: string;
  details?: string | undefined;
  statusCode: number;
}
