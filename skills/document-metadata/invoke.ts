import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  DocumentMetadataInputSchema,
  type DocumentMetadataInput,
  type DocumentMetadataOutput,
  type DocumentHeader,
  type DocumentStatistics,
  type DocumentCharacteristics,
  type GenreMarker,
  type GenreType,
} from './schema.js';

// Speaker detection patterns
const SPEAKER_PATTERNS = [
  /^([A-Z][A-Z\s.]+):\s/gm, // DR. SMITH: or SPEAKER ONE:
  /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*):\s/gm, // John Smith:
  /^\[([^\]]+)\]:\s/gm, // [Speaker Name]:
  /^(Speaker\s*\d+):\s/gim, // Speaker 1:
  /^(Interviewer|Interviewee|Host|Guest|Moderator|Participant\s*\d*):\s/gim,
];

// Genre indicator words
const GENRE_INDICATORS: Record<GenreType, string[]> = {
  academic: [
    'hypothesis',
    'methodology',
    'abstract',
    'conclusion',
    'findings',
    'research',
    'study',
    'analysis',
    'literature',
    'theoretical',
    'empirical',
    'data',
    'results',
    'significant',
    'correlation',
    'variables',
  ],
  conversational: [
    'yeah',
    'okay',
    'right',
    'well',
    'like',
    'you know',
    'I mean',
    'basically',
    'actually',
    'honestly',
    'so',
    'anyway',
    'um',
    'uh',
  ],
  persuasive: [
    'must',
    'should',
    'need to',
    'important',
    'crucial',
    'essential',
    'believe',
    'argue',
    'clearly',
    'obviously',
    'undoubtedly',
    'therefore',
    'consequently',
  ],
  narrative: [
    'once',
    'then',
    'after',
    'before',
    'while',
    'during',
    'suddenly',
    'finally',
    'eventually',
    'meanwhile',
    'story',
    'happened',
    'remember',
  ],
  technical: [
    'function',
    'method',
    'parameter',
    'implementation',
    'algorithm',
    'system',
    'process',
    'configuration',
    'interface',
    'module',
    'component',
    'API',
  ],
  formal: [
    'furthermore',
    'moreover',
    'however',
    'nevertheless',
    'consequently',
    'therefore',
    'hereby',
    'pursuant',
    'whereas',
    'notwithstanding',
    'accordingly',
  ],
};

// Formality indicators
const INFORMAL_MARKERS = [
  'gonna',
  'wanna',
  'gotta',
  "don't",
  "can't",
  "won't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  'yeah',
  'yep',
  'nope',
  'ok',
  'okay',
  'stuff',
  'things',
  'guy',
  'guys',
  'cool',
  'awesome',
  'pretty',
  'really',
  'super',
  'totally',
  '!',
  '...',
];

const FORMAL_MARKERS = [
  'therefore',
  'furthermore',
  'moreover',
  'consequently',
  'nevertheless',
  'notwithstanding',
  'hereby',
  'whereas',
  'pursuant',
  'regarding',
  'concerning',
  'respectively',
  'henceforth',
  'aforementioned',
];

function extractTitle(text: string, filename: string): string {
  const lines = text.split('\n').filter((line) => line.trim());

  // Check for markdown heading
  const markdownHeading = lines.find((line) => /^#+\s+.+/.test(line));
  if (markdownHeading) {
    return markdownHeading.replace(/^#+\s+/, '').trim();
  }

  // Check for title-like first line (short, no punctuation at end except ?)
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 100 && !/[.!,;]$/.test(firstLine)) {
    return firstLine;
  }

  // Derive from filename
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractAuthors(text: string): string[] {
  const authors = new Set<string>();

  // Look for "by" attribution
  const byMatch = text.match(/\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (byMatch && byMatch[1]) {
    authors.add(byMatch[1]);
  }

  // Look for "Author:" pattern
  const authorMatch = text.match(/Author[s]?:\s*([^\n]+)/i);
  if (authorMatch && authorMatch[1]) {
    authorMatch[1].split(/[,&]/).forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) authors.add(trimmed);
    });
  }

  return Array.from(authors);
}

function extractSpeakers(text: string): string[] {
  const speakers = new Set<string>();

  for (const pattern of SPEAKER_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const matchedSpeaker = match[1];
      if (matchedSpeaker) {
        const speaker = matchedSpeaker.trim();
        if (speaker.length > 1 && speaker.length < 50) {
          speakers.add(speaker);
        }
      }
    }
  }

  return Array.from(speakers);
}

function extractHeader(text: string, filename: string): DocumentHeader {
  const now = new Date();
  const speakers = extractSpeakers(text);

  const dateStr = now.toISOString().split('T')[0];
  return {
    title: extractTitle(text, filename),
    authors: [...extractAuthors(text), ...speakers],
    sourceFile: filename,
    analysisDate: dateStr || now.toISOString().slice(0, 10),
    analysisTimestamp: now.toISOString(),
  };
}

function calculateStatistics(text: string, wordsPerMinute: number): DocumentStatistics {
  const characterCount = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(1, paragraphs.length);

  const estimatedReadingTimeMinutes = Math.ceil(wordCount / wordsPerMinute);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    characterCount,
    estimatedReadingTimeMinutes,
  };
}

function analyzeCharacteristics(text: string): DocumentCharacteristics {
  const totalWords = text.split(/\s+/).length || 1;

  // Calculate genre scores
  const genreMarkers: GenreMarker[] = [];
  for (const [genre, indicators] of Object.entries(GENRE_INDICATORS)) {
    let count = 0;
    for (const indicator of indicators) {
      const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      count += matches ? matches.length : 0;
    }
    const score = Math.min(1, count / (totalWords * 0.02));
    if (score > 0.1) {
      genreMarkers.push({
        genre: genre as GenreType,
        score: Math.round(score * 100) / 100,
      });
    }
  }
  genreMarkers.sort((a, b) => b.score - a.score);

  // Calculate formality score
  let informalCount = 0;
  let formalCount = 0;

  for (const marker of INFORMAL_MARKERS) {
    const regex = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    informalCount += matches ? matches.length : 0;
  }

  for (const marker of FORMAL_MARKERS) {
    const regex = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    formalCount += matches ? matches.length : 0;
  }

  const markerTotal = informalCount + formalCount || 1;
  const formalityScore = Math.round(((formalCount / markerTotal) * 0.5 + 0.5) * 100) / 100;

  // Detect speakers
  const speakers = extractSpeakers(text);
  const isDialogic = speakers.length >= 2;

  return {
    genreMarkers,
    formalityScore,
    isDialogic,
    speakers,
  };
}

export const documentMetadata: Skill<DocumentMetadataInput, DocumentMetadataOutput> = {
  metadata: {
    name: 'document-metadata',
    version: '1.0.0',
    description: 'Analyze document text for metadata, statistics, and characteristics',
    category: 'document',
  },

  validate(input: DocumentMetadataInput) {
    const result = DocumentMetadataInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: DocumentMetadataInput): Promise<SkillResult<DocumentMetadataOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<DocumentMetadataOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const { text, filename, wordsPerMinute = 200 } = input;

      const header = extractHeader(text, filename);
      const statistics = calculateStatistics(text, wordsPerMinute);
      const characteristics = analyzeCharacteristics(text);

      return createSkillResult(name, version, startTime, {
        header,
        statistics,
        characteristics,
      });
    } catch (error) {
      return createSkillResult<DocumentMetadataOutput>(name, version, startTime, undefined, {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze document',
        details: error,
      });
    }
  },
};

export default documentMetadata;
