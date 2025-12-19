# Skill: sentiment-analyzer

## Purpose

Analyze text sentiment using Claude API, returning classification with
confidence scores, emotional indicators, and optional emotion intensity scores.

## When to Use

- User asks about the tone or feeling of text
- Analyzing customer feedback or reviews
- Pre-processing for emotion analysis
- Understanding the emotional content of documents

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | Text to analyze (max 10000 chars) |
| emotions | string[] | no | Specific emotions to detect with intensity scores |

### Available Emotions

- joy, anger, sadness, fear, surprise, disgust
- love, trust, anticipation, confusion

## Outputs

| Name | Type | Description |
|------|------|-------------|
| sentiment | string | "positive", "negative", or "neutral" |
| confidence | number | 0-1 confidence score |
| indicators | string[] | Key emotional words/phrases found |
| explanation | string | Human-readable analysis |
| emotions | object | Emotion intensity scores (if requested) |

## Example Usage

```typescript
import { sentimentAnalyzer } from '../skills/sentiment-analyzer';

const result = await sentimentAnalyzer.invoke({
  text: 'I absolutely loved this product! Best purchase ever.',
  emotions: ['joy', 'trust'],
});

if (result.success) {
  console.log(result.data.sentiment);   // "positive"
  console.log(result.data.confidence);  // 0.95
  console.log(result.data.emotions);    // { joy: 0.9, trust: 0.7 }
}
```

## Dependencies

- Claude API access (Anthropic SDK)
- `ANTHROPIC_API_KEY` environment variable

## Error Handling

- Returns error if text exceeds 10000 characters
- Returns error if API is unavailable
- Returns error if API key is not configured
