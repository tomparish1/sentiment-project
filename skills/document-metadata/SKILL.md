# Skill: document-metadata

## Purpose

Analyze document text to extract metadata, statistics, and characteristics.
Identifies genre markers, formality level, speakers (for transcripts), and
provides reading statistics.

## When to Use

- After parsing a document, to understand its structure
- When you need word count, reading time, or other statistics
- To detect if a document is a transcript (dialogic)
- To identify the genre/style of writing

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | Plain text content to analyze |
| filename | string | yes | Source filename for title inference |
| wordsPerMinute | number | no | Reading speed for time estimate (default: 200) |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| header | object | Title, authors, source file, timestamps |
| statistics | object | Word count, sentences, paragraphs, reading time |
| characteristics | object | Genre markers, formality score, speakers, isDialogic |

### Output Schema Details

```typescript
interface DocumentMetadata {
  header: {
    title: string;
    authors: string[];
    sourceFile: string;
    analysisDate: string;
    analysisTimestamp: string;
  };
  statistics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    characterCount: number;
    estimatedReadingTimeMinutes: number;
  };
  characteristics: {
    genreMarkers: Array<{ genre: string; score: number }>;
    formalityScore: number;  // 0-1, higher = more formal
    isDialogic: boolean;     // true if multiple speakers
    speakers: string[];
  };
}
```

## Example Usage

```typescript
import { documentMetadata } from '../skills/document-metadata';

const result = await documentMetadata.invoke({
  text: 'DR. SMITH: Welcome to the podcast...',
  filename: 'interview.txt',
});

if (result.success) {
  console.log(result.data.characteristics.isDialogic); // true
  console.log(result.data.characteristics.speakers);   // ['DR. SMITH', ...]
}
```

## Genre Detection

Detects these genre markers with confidence scores:
- **academic** - Research language (hypothesis, methodology, findings)
- **conversational** - Informal speech (yeah, okay, you know)
- **persuasive** - Argumentative language (must, should, clearly)
- **narrative** - Story elements (then, suddenly, finally)
- **technical** - Technical terms (function, API, implementation)
- **formal** - Formal language (furthermore, nevertheless)

## Dependencies

None (pure text analysis)

## Error Handling

- Returns error if text is empty
- Returns default values for missing metadata (e.g., title from filename)
