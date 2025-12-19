# Skill: text-segmenter

## Purpose

Split text into analyzable segments using various strategies. Supports sentence,
paragraph, sliding window, and speaker-turn segmentation for transcript analysis.

## When to Use

- Before rhetoric analysis to create segments for classification
- When processing transcripts with multiple speakers
- Any task requiring text chunking

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | Text to segment |
| method | string | no | Segmentation method (default: "sentence") |
| minWords | number | no | Minimum words per segment (default: 5) |
| maxWords | number | no | Maximum words per segment (default: 100) |
| overlapWords | number | no | Overlap for sliding window (default: 25) |
| speakerPattern | string | no | Regex for speaker labels |

### Segmentation Methods

- `sentence` - Split on sentence boundaries
- `paragraph` - Split on double newlines
- `sliding` - Sliding window with overlap
- `speaker_turn` - Split on speaker labels (for transcripts)

## Outputs

| Name | Type | Description |
|------|------|-------------|
| segments | TextSegment[] | Array of segment objects |
| totalSegments | number | Number of segments created |
| method | string | Method used for segmentation |

### TextSegment Schema

```typescript
interface TextSegment {
  text: string;
  start: number;      // Character position in original
  end: number;        // Character position in original
  index: number;      // Segment index
  speaker?: string;   // For speaker_turn method
  wordCount: number;
}
```

## Example Usage

```typescript
import { textSegmenter } from '../skills/text-segmenter';

// Sentence segmentation
const result = await textSegmenter.invoke({
  text: 'First sentence. Second sentence. Third one here.',
  method: 'sentence',
});

// Transcript segmentation
const transcriptResult = await textSegmenter.invoke({
  text: 'HOST: Welcome to the show.\nGUEST: Thanks for having me.',
  method: 'speaker_turn',
});
```

## Dependencies

None (pure text processing)

## Notes

- Short segments (below minWords) are filtered out
- Long segments are truncated to maxWords
- Speaker detection uses configurable regex patterns
