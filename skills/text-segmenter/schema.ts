import { z } from 'zod';

export const SegmentationMethod = z.enum(['sentence', 'paragraph', 'sliding', 'speaker_turn']);

export type SegmentationMethod = z.infer<typeof SegmentationMethod>;

export const TextSegmenterInputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  method: SegmentationMethod.optional().default('sentence'),
  minWords: z.number().positive().optional().default(5),
  maxWords: z.number().positive().optional().default(100),
  overlapWords: z.number().nonnegative().optional().default(25),
  speakerPattern: z
    .string()
    .optional()
    .default('^([A-Z][A-Z\\s.]+):'),
});

export type TextSegmenterInput = z.infer<typeof TextSegmenterInputSchema>;

export const TextSegmentSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  index: z.number(),
  speaker: z.string().optional(),
  wordCount: z.number(),
});

export type TextSegment = z.infer<typeof TextSegmentSchema>;

export const TextSegmenterOutputSchema = z.object({
  segments: z.array(TextSegmentSchema),
  totalSegments: z.number(),
  method: SegmentationMethod,
});

export type TextSegmenterOutput = z.infer<typeof TextSegmenterOutputSchema>;
