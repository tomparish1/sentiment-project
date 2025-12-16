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
  genre: 'academic' | 'conversational' | 'persuasive' | 'narrative' | 'technical' | 'formal';
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

// Speaker detection patterns
const SPEAKER_PATTERNS = [
  /^([A-Z][A-Z\s.]+):\s/gm, // DR. SMITH: or SPEAKER ONE:
  /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*):\s/gm, // John Smith:
  /^\[([^\]]+)\]:\s/gm, // [Speaker Name]:
  /^(Speaker\s*\d+):\s/gim, // Speaker 1:
  /^(Interviewer|Interviewee|Host|Guest|Moderator|Participant\s*\d*):\s/gim,
];

// Genre indicator words
const GENRE_INDICATORS = {
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

export function analyzeDocument(
  text: string,
  filename: string,
  wordsPerMinute: number = 200
): DocumentMetadata {
  const header = extractHeader(text, filename);
  const statistics = calculateStatistics(text, wordsPerMinute);
  const characteristics = analyzeCharacteristics(text);

  return { header, statistics, characteristics };
}

function extractHeader(text: string, filename: string): DocumentHeader {
  const now = new Date();

  return {
    title: extractTitle(text, filename),
    authors: extractAuthors(text),
    sourceFile: filename,
    analysisDate: now.toISOString().split('T')[0],
    analysisTimestamp: now.toISOString(),
  };
}

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
  if (byMatch) {
    authors.add(byMatch[1]);
  }

  // Look for "Author:" pattern
  const authorMatch = text.match(/Author[s]?:\s*([^\n]+)/i);
  if (authorMatch) {
    authorMatch[1].split(/[,&]/).forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) authors.add(trimmed);
    });
  }

  // Detect speakers from transcript patterns
  for (const pattern of SPEAKER_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const speaker = match[1].trim();
      if (speaker.length > 1 && speaker.length < 50) {
        authors.add(speaker);
      }
    }
  }

  return Array.from(authors);
}

function calculateStatistics(text: string, wordsPerMinute: number): DocumentStatistics {
  const characterCount = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Sentence detection (handles abbreviations somewhat)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // Paragraph detection (double newline or single newline with blank)
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
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const totalWords = words.length || 1;

  // Calculate genre scores
  const genreMarkers: GenreMarker[] = [];
  for (const [genre, indicators] of Object.entries(GENRE_INDICATORS)) {
    let count = 0;
    for (const indicator of indicators) {
      const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      count += matches ? matches.length : 0;
    }
    const score = Math.min(1, count / (totalWords * 0.02)); // Normalize
    if (score > 0.1) {
      genreMarkers.push({
        genre: genre as GenreMarker['genre'],
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
  const speakers = new Set<string>();
  for (const pattern of SPEAKER_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const speaker = match[1].trim();
      if (speaker.length > 1 && speaker.length < 50) {
        speakers.add(speaker);
      }
    }
  }

  const isDialogic = speakers.size >= 2;

  return {
    genreMarkers,
    formalityScore,
    isDialogic,
    speakers: Array.from(speakers),
  };
}
