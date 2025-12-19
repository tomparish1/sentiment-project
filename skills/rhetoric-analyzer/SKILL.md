# Skill: rhetoric-analyzer

## Purpose

Analyze text for rhetorical moves by comparing segments against a collection of
annotated exemplars. Orchestrates text-segmenter, embedding-engine, and
exemplar-store skills to provide complete rhetoric analysis.

## When to Use

- Analyzing documents for rhetorical patterns
- Understanding argumentative structure
- Identifying persuasion techniques
- Analyzing transcripts for dialogue patterns

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | Text to analyze |
| exemplarStorePath | string | yes | Path to exemplar collection JSON |
| inputFile | string | no | Source filename for provenance |
| segmentationMethod | string | no | How to segment (default: "sentence") |
| confidenceThreshold | number | no | Min confidence for classification (default: 0.5) |
| topK | number | no | Exemplars to consider per segment (default: 5) |
| minExemplarsPerType | number | no | Min exemplars required for move type (default: 3) |
| includeAlternatives | boolean | no | Include alternative classifications (default: true) |
| includeExemplarMatches | boolean | no | Show matched exemplars (default: true) |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| id | string | Unique analysis ID |
| timestamp | string | Analysis timestamp |
| inputFile | string | Source file name |
| wordCount | number | Total words analyzed |
| segments | ClassifiedSegment[] | Analyzed segments with classifications |
| summary | object | Statistics and narrative summary |

### ClassifiedSegment Schema

```typescript
interface ClassifiedSegment {
  text: string;
  start: number;
  end: number;
  moveType: string;
  moveCategory: string;
  confidence: number;
  speaker?: string;
  alternatives?: Array<{ moveType: string; category: string; confidence: number }>;
  matchedExemplars?: Array<{ id: string; text: string; score: number }>;
}
```

## Example Usage

```typescript
import { rhetoricAnalyzer } from '../skills/rhetoric-analyzer';

const result = await rhetoricAnalyzer.invoke({
  text: 'Admittedly, critics have raised valid points. However, the evidence...',
  exemplarStorePath: 'data/exemplars/starter.json',
  segmentationMethod: 'sentence',
  confidenceThreshold: 0.5,
});

if (result.success) {
  console.log(result.data.summary.narrative);
  // "Detected 2 rhetorical moves. Most frequent: concession (1), contrast (1)."
}
```

## Dependencies

- `text-segmenter` skill
- `embedding-engine` skill
- `exemplar-store` skill

## Classification Method

1. Segment text using configured method
2. For each segment, find top-K similar exemplars
3. Vote among exemplars (weighted by similarity)
4. Apply confidence threshold
5. Generate summary statistics
