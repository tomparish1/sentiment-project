import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  TextSegmenterInputSchema,
  type TextSegmenterInput,
  type TextSegmenterOutput,
  type TextSegment,
  type SegmentationMethod,
} from './schema.js';

interface SegmentConfig {
  minWords: number;
  maxWords: number;
  overlapWords: number;
  speakerPattern: string;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function truncateToMaxWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}

function segmentSentences(text: string, config: SegmentConfig): TextSegment[] {
  const segments: TextSegment[] = [];
  // Pattern handles common abbreviations
  const pattern = /(?<![A-Z][a-z]|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)[.!?]+\s+/g;

  const sentences = text.split(pattern);
  let pos = 0;
  let index = 0;

  for (const sent of sentences) {
    const trimmed = sent.trim();
    if (!trimmed) {
      pos += sent.length + 1;
      continue;
    }

    const wordCount = countWords(trimmed);
    if (wordCount < config.minWords) {
      pos += sent.length + 1;
      continue;
    }

    const segmentText =
      wordCount > config.maxWords ? truncateToMaxWords(trimmed, config.maxWords) : trimmed;

    const start = text.indexOf(trimmed, pos);
    const actualStart = start === -1 ? pos : start;

    segments.push({
      text: segmentText,
      start: actualStart,
      end: actualStart + trimmed.length,
      index,
      wordCount: countWords(segmentText),
    });

    pos = actualStart + trimmed.length;
    index++;
  }

  return segments;
}

function segmentParagraphs(text: string, config: SegmentConfig): TextSegment[] {
  const segments: TextSegment[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let pos = 0;
  let index = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      pos += para.length + 2;
      continue;
    }

    const wordCount = countWords(trimmed);
    if (wordCount < config.minWords) {
      pos += para.length + 2;
      continue;
    }

    const segmentText =
      wordCount > config.maxWords ? truncateToMaxWords(trimmed, config.maxWords) : trimmed;

    const start = text.indexOf(trimmed, pos);
    const actualStart = start === -1 ? pos : start;

    segments.push({
      text: segmentText,
      start: actualStart,
      end: actualStart + trimmed.length,
      index,
      wordCount: countWords(segmentText),
    });

    pos = actualStart + trimmed.length;
    index++;
  }

  return segments;
}

function segmentSliding(text: string, config: SegmentConfig): TextSegment[] {
  const segments: TextSegment[] = [];
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const windowSize = config.maxWords;
  const step = windowSize - config.overlapWords;
  let index = 0;

  let i = 0;
  while (i < words.length) {
    const windowWords = words.slice(i, i + windowSize);
    const windowText = windowWords.join(' ');

    // Calculate approximate character positions
    const beforeText = words.slice(0, i).join(' ');
    const start = beforeText.length + (i > 0 ? 1 : 0);
    const end = start + windowText.length;

    segments.push({
      text: windowText,
      start,
      end,
      index,
      wordCount: windowWords.length,
    });

    i += step;
    index++;
  }

  return segments;
}

function segmentSpeakerTurns(text: string, config: SegmentConfig): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = new RegExp(config.speakerPattern, 'gm');
  const lines = text.split('\n');

  let currentSpeaker: string | null = null;
  let currentTurn: string[] = [];
  let currentStart = 0;
  let pos = 0;
  let index = 0;

  for (const line of lines) {
    const match = pattern.exec(line);
    pattern.lastIndex = 0; // Reset regex state

    if (match) {
      // Save previous turn
      if (currentTurn.length > 0) {
        const turnText = currentTurn.join(' ').trim();
        const wordCount = countWords(turnText);

        if (wordCount >= config.minWords) {
          const segmentText =
            wordCount > config.maxWords ? truncateToMaxWords(turnText, config.maxWords) : turnText;

          segments.push({
            text: segmentText,
            start: currentStart,
            end: pos,
            index,
            speaker: currentSpeaker ?? undefined,
            wordCount: countWords(segmentText),
          });
          index++;
        }
      }

      // Start new turn
      const matchedSpeaker = match[1];
      currentSpeaker = matchedSpeaker ? matchedSpeaker.trim() : '';
      const content = line.slice(match[0].length).trim();
      currentTurn = content ? [content] : [];
      currentStart = pos;
    } else if (line.trim()) {
      currentTurn.push(line.trim());
    }

    pos += line.length + 1;
  }

  // Save final turn
  if (currentTurn.length > 0) {
    const turnText = currentTurn.join(' ').trim();
    const wordCount = countWords(turnText);

    if (wordCount >= config.minWords) {
      const segmentText =
        wordCount > config.maxWords ? truncateToMaxWords(turnText, config.maxWords) : turnText;

      segments.push({
        text: segmentText,
        start: currentStart,
        end: pos,
        index,
        speaker: currentSpeaker ?? undefined,
        wordCount: countWords(segmentText),
      });
    }
  }

  return segments;
}

export const textSegmenter: Skill<TextSegmenterInput, TextSegmenterOutput> = {
  metadata: {
    name: 'text-segmenter',
    version: '1.0.0',
    description: 'Split text into analyzable segments using various strategies',
    category: 'text-processing',
  },

  validate(input: TextSegmenterInput) {
    const result = TextSegmenterInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: TextSegmenterInput): Promise<SkillResult<TextSegmenterOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<TextSegmenterOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const {
        text,
        method = 'sentence',
        minWords = 5,
        maxWords = 100,
        overlapWords = 25,
        speakerPattern = '^([A-Z][A-Z\\s.]+):',
      } = input;

      const config: SegmentConfig = {
        minWords,
        maxWords,
        overlapWords,
        speakerPattern,
      };

      let segments: TextSegment[];

      switch (method) {
        case 'sentence':
          segments = segmentSentences(text, config);
          break;
        case 'paragraph':
          segments = segmentParagraphs(text, config);
          break;
        case 'sliding':
          segments = segmentSliding(text, config);
          break;
        case 'speaker_turn':
          segments = segmentSpeakerTurns(text, config);
          break;
        default:
          segments = segmentSentences(text, config);
      }

      return createSkillResult(name, version, startTime, {
        segments,
        totalSegments: segments.length,
        method: method as SegmentationMethod,
      });
    } catch (error) {
      return createSkillResult<TextSegmenterOutput>(name, version, startTime, undefined, {
        code: 'SEGMENTATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to segment text',
        details: error,
      });
    }
  },
};

export default textSegmenter;
