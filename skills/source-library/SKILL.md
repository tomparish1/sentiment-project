# Source Library Skill

## Overview

The Source Library skill enables indexing and semantic search across configured content sources. It chunks documents, generates embeddings, and stores them for fast similarity search.

## Operations

### `index`

Index a configured source for semantic search.

**Input:**
```typescript
{
  operation: 'index',
  sourceId: string,          // ID from sources.json
  chunkSize?: number,        // Words per chunk (default: 500)
  chunkOverlap?: number,     // Overlap words (default: 50)
  forceReindex?: boolean     // Overwrite existing (default: false)
}
```

**Output:**
```typescript
{
  sourceId: string,
  documentsIndexed: number,
  chunksCreated: number,
  dimensions: number,
  indexPath: string
}
```

### `search`

Perform semantic search across indexed sources.

**Input:**
```typescript
{
  operation: 'search',
  query: string,                    // Search query
  sourceTypes?: SourceType[],       // Filter by type
  sourceIds?: string[],             // Filter by specific sources
  topK?: number,                    // Results to return (default: 10)
  minSimilarity?: number            // 0-1 threshold (default: 0.5)
}
```

**Output:**
```typescript
{
  query: string,
  results: SearchResultItem[],
  totalResults: number,
  searchTimeMs: number
}
```

### `list`

List all configured sources with indexing status.

**Input:**
```typescript
{
  operation: 'list',
  includeStats?: boolean    // Include detailed stats (default: false)
}
```

**Output:**
```typescript
{
  sources: SourceStats[],
  totalSources: number,
  indexedSources: number
}
```

### `stats`

Get detailed statistics for indexed sources.

**Input:**
```typescript
{
  operation: 'stats',
  sourceId?: string    // Specific source, or all if omitted
}
```

**Output:**
```typescript
{
  sources: SourceStats[]
}
```

### `delete`

Delete an index for a source.

**Input:**
```typescript
{
  operation: 'delete',
  sourceId: string
}
```

**Output:**
```typescript
{
  sourceId: string,
  deleted: boolean
}
```

### `reindex`

Delete and recreate an index for a source.

**Input:**
```typescript
{
  operation: 'reindex',
  sourceId: string,
  chunkSize?: number,
  chunkOverlap?: number
}
```

## Source Types

- `newsletter` - Published newsletters
- `transcript` - Podcast/video transcripts
- `story-idea` - Story ideas and writing starts
- `personal` - Personal stories and essays
- `manuscript` - Novel/novella materials
- `external` - Imported external content

## Configuration

Sources are configured in `/library/sources.json`:

```json
{
  "sources": [
    {
      "id": "substack-newsletters",
      "type": "newsletter",
      "path": "/path/to/newsletters",
      "label": "My Newsletters",
      "description": "Published Substack newsletters",
      "enabled": true,
      "filePatterns": ["**/*.txt", "**/*.md"],
      "excludePatterns": ["**/node_modules/**"]
    }
  ]
}
```

## Storage

- **Indices:** `/library/indices/{sourceId}.json` - Chunk metadata and text
- **Vectors:** `/library/vectors/{sourceId}.bin` - Float32 embeddings

## Dependencies

- `embedding-engine` - For generating text embeddings
- `glob` - For file pattern matching

## Example Usage

```typescript
// Index a source
const indexResult = await sourceLibrary.invoke({
  operation: 'index',
  sourceId: 'substack-newsletters',
  chunkSize: 500,
  chunkOverlap: 50
});

// Search across all sources
const searchResult = await sourceLibrary.invoke({
  operation: 'search',
  query: 'artificial intelligence and creativity',
  topK: 5,
  minSimilarity: 0.6
});

// Search specific source types
const transcriptSearch = await sourceLibrary.invoke({
  operation: 'search',
  query: 'interview about technology',
  sourceTypes: ['transcript'],
  topK: 10
});
```
