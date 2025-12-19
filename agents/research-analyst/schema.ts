import { z } from 'zod';
import type { DocumentMetadataOutput } from '../../skills/document-metadata/schema.js';
import type { SentimentAnalyzerOutput } from '../../skills/sentiment-analyzer/schema.js';
import type { RhetoricAnalyzerOutput } from '../../skills/rhetoric-analyzer/schema.js';

export const ResearchAnalystInputSchema = z
  .object({
    text: z.string().optional(),
    buffer: z.instanceof(Buffer).optional(),
    filename: z.string().optional().default('document.txt'),
    mimetype: z.string().optional().default('text/plain'),
    exemplarStorePath: z.string().optional(),
    emotions: z
      .array(
        z.enum([
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
        ])
      )
      .optional(),
    maxSpeakers: z.number().positive().optional().default(5),
    includeQuotes: z.boolean().optional().default(true),
  })
  .refine((data) => data.text || data.buffer, {
    message: 'Either text or buffer must be provided',
  });

export type ResearchAnalystInput = z.infer<typeof ResearchAnalystInputSchema>;

export interface SpeakerAnalysis {
  speaker: string;
  wordCount: number;
  segmentCount: number;
  sentiment?: SentimentAnalyzerOutput;
  notableQuotes?: string[];
}

export interface SpeakerComparison {
  speakers: string[];
  sentimentComparison: Array<{
    speaker: string;
    sentiment: string;
    confidence: number;
  }>;
  dynamics: string;
  mostPositive?: string;
  mostNegative?: string;
}

export interface ResearchReport {
  title: string;
  executiveSummary: string;
  methodology: string[];
  keyFindings: string[];
  speakerInsights: string[];
  rhetoricalPatterns: string[];
  conclusions: string[];
  generatedAt: string;
}

export interface ResearchAnalystOutput {
  document: DocumentMetadataOutput;
  overall: {
    sentiment?: SentimentAnalyzerOutput;
    rhetoric?: RhetoricAnalyzerOutput;
  };
  speakers?: SpeakerAnalysis[];
  comparison?: SpeakerComparison;
  report: ResearchReport;
}

export interface ResearchAnalystState {
  text?: string;
  filename: string;
  document?: DocumentMetadataOutput;
  overallSentiment?: SentimentAnalyzerOutput;
  overallRhetoric?: RhetoricAnalyzerOutput;
  speakerTexts: Map<string, string>;
  speakerAnalyses: SpeakerAnalysis[];
  isDialogic: boolean;
}
