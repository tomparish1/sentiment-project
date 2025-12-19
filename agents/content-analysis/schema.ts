import { z } from 'zod';
import type { DocumentMetadataOutput } from '../../skills/document-metadata/schema.js';
import type { SentimentAnalyzerOutput } from '../../skills/sentiment-analyzer/schema.js';
import type { RhetoricAnalyzerOutput } from '../../skills/rhetoric-analyzer/schema.js';

export const ContentAnalysisInputSchema = z
  .object({
    // Either text or buffer must be provided
    text: z.string().optional(),
    buffer: z.instanceof(Buffer).optional(),
    filename: z.string().optional().default('document.txt'),
    mimetype: z.string().optional().default('text/plain'),

    // Analysis options
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

    // Control flags
    skipRhetoric: z.boolean().optional().default(false),
    forceRhetoric: z.boolean().optional().default(false),
    skipSentiment: z.boolean().optional().default(false),
  })
  .refine((data) => data.text || data.buffer, {
    message: 'Either text or buffer must be provided',
  });

export type ContentAnalysisInput = z.infer<typeof ContentAnalysisInputSchema>;

export const SynthesisSchema = z.object({
  summary: z.string(),
  primaryTone: z.string(),
  keyFindings: z.array(z.string()),
  analysisPerformed: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;

export interface ContentAnalysisOutput {
  document: DocumentMetadataOutput;
  sentiment?: SentimentAnalyzerOutput;
  rhetoric?: RhetoricAnalyzerOutput;
  synthesis: Synthesis;
}

export interface ContentAnalysisState {
  text?: string;
  filename: string;
  document?: DocumentMetadataOutput;
  sentiment?: SentimentAnalyzerOutput;
  rhetoric?: RhetoricAnalyzerOutput;
  shouldAnalyzeRhetoric: boolean;
}
