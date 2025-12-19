import { z } from 'zod';
import { SegmentationMethod } from '../text-segmenter/schema.js';

export const RhetoricAnalyzerInputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  exemplarStorePath: z.string().min(1, 'Exemplar store path is required'),
  inputFile: z.string().default('<stdin>'),
  segmentationMethod: SegmentationMethod.default('sentence'),
  confidenceThreshold: z.number().min(0).max(1).default(0.5),
  topK: z.number().positive().default(5),
  minExemplarsPerType: z.number().positive().default(3),
  includeAlternatives: z.boolean().default(true),
  includeExemplarMatches: z.boolean().default(true),
  maxAlternatives: z.number().positive().default(3),
});

export type RhetoricAnalyzerInput = {
  text: string;
  exemplarStorePath: string;
  inputFile?: string;
  segmentationMethod?: 'sentence' | 'paragraph' | 'sliding' | 'speaker_turn';
  confidenceThreshold?: number;
  topK?: number;
  minExemplarsPerType?: number;
  includeAlternatives?: boolean;
  includeExemplarMatches?: boolean;
  maxAlternatives?: number;
};

export const AlternativeClassificationSchema = z.object({
  moveType: z.string(),
  category: z.string(),
  confidence: z.number(),
});

export type AlternativeClassification = z.infer<typeof AlternativeClassificationSchema>;

export const MatchedExemplarSchema = z.object({
  id: z.string(),
  text: z.string(),
  score: z.number(),
});

export type MatchedExemplar = z.infer<typeof MatchedExemplarSchema>;

export const ClassifiedSegmentSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  moveType: z.string(),
  moveCategory: z.string(),
  confidence: z.number(),
  speaker: z.string().optional(),
  alternatives: z.array(AlternativeClassificationSchema).optional(),
  matchedExemplars: z.array(MatchedExemplarSchema).optional(),
});

export type ClassifiedSegment = z.infer<typeof ClassifiedSegmentSchema>;

export const AnalysisSummarySchema = z.object({
  totalSegments: z.number(),
  classifiedSegments: z.number(),
  classificationRate: z.number(),
  averageConfidence: z.number(),
  moveCounts: z.record(z.string(), z.number()),
  categoryCounts: z.record(z.string(), z.number()),
  topMoves: z.array(z.tuple([z.string(), z.number()])),
  narrative: z.string(),
});

export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;

export const RhetoricAnalyzerOutputSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  inputFile: z.string(),
  inputTextPreview: z.string(),
  wordCount: z.number(),
  config: z.object({
    segmentationMethod: z.string(),
    confidenceThreshold: z.number(),
    topK: z.number(),
  }),
  exemplarStore: z.object({
    path: z.string(),
    exemplarCount: z.number(),
  }),
  segments: z.array(ClassifiedSegmentSchema),
  summary: AnalysisSummarySchema,
});

export type RhetoricAnalyzerOutput = z.infer<typeof RhetoricAnalyzerOutputSchema>;
