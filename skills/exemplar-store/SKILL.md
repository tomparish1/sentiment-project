# Skill: exemplar-store

## Purpose

Manage collections of rhetorical move exemplars. Provides CRUD operations,
similarity search, and JSON persistence for exemplar-based classification.

## When to Use

- Loading/saving exemplar collections
- Adding new annotated exemplars
- Finding similar exemplars for classification
- Getting collection statistics

## Operations

This skill supports multiple operations via the `operation` field:

### load
Load exemplars from a JSON file.

### save
Save current exemplars to a JSON file.

### add
Add a new exemplar with automatic embedding computation.

### remove
Remove an exemplar by ID.

### search
Find exemplars most similar to input text.

### stats
Get collection statistics.

### list
List all exemplars (optionally filtered by move type).

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| operation | string | yes | Operation to perform |
| storePath | string | no | Path to JSON store file |
| exemplar | object | no | Exemplar data (for add) |
| exemplarId | string | no | Exemplar ID (for remove) |
| text | string | no | Query text (for search) |
| topK | number | no | Number of results (for search, default: 5) |
| threshold | number | no | Minimum similarity (for search, default: 0) |
| moveType | string | no | Filter by move type |

### Exemplar Schema

```typescript
interface Exemplar {
  id: string;
  text: string;
  moveType: string;
  moveCategory: string;
  contextBefore?: string;
  contextAfter?: string;
  sourceFile?: string;
  sourceTitle?: string;
  speaker?: string;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  embedding?: number[];
}
```

## Example Usage

```typescript
import { exemplarStore } from '../skills/exemplar-store';

// Load a store
await exemplarStore.invoke({
  operation: 'load',
  storePath: 'data/exemplars/starter.json',
});

// Add an exemplar
await exemplarStore.invoke({
  operation: 'add',
  storePath: 'data/exemplars/starter.json',
  exemplar: {
    text: 'Admittedly, this is true.',
    moveType: 'concession',
    moveCategory: 'dialogic',
  },
});

// Search for similar
const result = await exemplarStore.invoke({
  operation: 'search',
  storePath: 'data/exemplars/starter.json',
  text: 'I must admit...',
  topK: 5,
});
```

## Dependencies

- `embedding-engine` skill (for computing embeddings)

## Notes

- Embeddings are computed automatically when adding exemplars
- Store files are JSON for easy inspection and editing
- Similarity search uses cosine similarity on embeddings
