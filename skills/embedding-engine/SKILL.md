# Skill: embedding-engine

## Purpose

Compute text embeddings using transformer models. Provides vector representations
of text for similarity comparison, enabling exemplar-based classification.

## When to Use

- Computing embeddings for similarity search
- Encoding exemplars for the exemplar store
- Any task requiring semantic text similarity

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| texts | string[] | yes | Array of texts to encode |
| model | string | no | Model name (default: "Xenova/all-MiniLM-L6-v2") |
| normalize | boolean | no | Normalize vectors to unit length (default: true) |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| embeddings | number[][] | Array of embedding vectors |
| dimensions | number | Embedding dimension size |
| model | string | Model used for encoding |

## Example Usage

```typescript
import { embeddingEngine } from '../skills/embedding-engine';

const result = await embeddingEngine.invoke({
  texts: ['Hello world', 'How are you?'],
  normalize: true,
});

if (result.success) {
  console.log(result.data.embeddings.length); // 2
  console.log(result.data.dimensions);         // 384
}
```

## Supported Models

- `Xenova/all-MiniLM-L6-v2` (default) - Fast, 384 dimensions
- `Xenova/all-mpnet-base-v2` - Higher quality, 768 dimensions

## Dependencies

- `@xenova/transformers` - Hugging Face Transformers.js

## Notes

- First invocation downloads the model (~30MB for MiniLM)
- Models are cached locally after first download
- Supports batch encoding for efficiency
