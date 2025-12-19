import { z } from 'zod';

export const DocumentMetadataInputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  filename: z.string().min(1, 'Filename is required'),
  wordsPerMinute: z.number().positive().default(200),
});

export type DocumentMetadataInput = {
  text: string;
  filename: string;
  wordsPerMinute?: number;
};

export const GenreType = z.enum([
  'academic',
  'conversational',
  'persuasive',
  'narrative',
  'technical',
  'formal',
]);

export type GenreType = z.infer<typeof GenreType>;

export const GenreMarkerSchema = z.object({
  genre: GenreType,
  score: z.number().min(0).max(1),
});

export type GenreMarker = z.infer<typeof GenreMarkerSchema>;

export const DocumentHeaderSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  sourceFile: z.string(),
  analysisDate: z.string(),
  analysisTimestamp: z.string(),
});

export type DocumentHeader = z.infer<typeof DocumentHeaderSchema>;

export const DocumentStatisticsSchema = z.object({
  wordCount: z.number(),
  sentenceCount: z.number(),
  paragraphCount: z.number(),
  characterCount: z.number(),
  estimatedReadingTimeMinutes: z.number(),
});

export type DocumentStatistics = z.infer<typeof DocumentStatisticsSchema>;

export const DocumentCharacteristicsSchema = z.object({
  genreMarkers: z.array(GenreMarkerSchema),
  formalityScore: z.number().min(0).max(1),
  isDialogic: z.boolean(),
  speakers: z.array(z.string()),
});

export type DocumentCharacteristics = z.infer<typeof DocumentCharacteristicsSchema>;

export const DocumentMetadataOutputSchema = z.object({
  header: DocumentHeaderSchema,
  statistics: DocumentStatisticsSchema,
  characteristics: DocumentCharacteristicsSchema,
});

export type DocumentMetadataOutput = z.infer<typeof DocumentMetadataOutputSchema>;
