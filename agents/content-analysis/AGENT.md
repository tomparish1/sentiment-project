# Agent: content-analysis

## Purpose

Conduct comprehensive content analysis by orchestrating multiple analysis skills.
Combines document parsing, metadata extraction, sentiment analysis, and rhetoric
analysis into a unified workflow with intelligent decision-making.

## Capabilities

- Parse uploaded documents (PDF, DOCX, TXT, MD)
- Extract document metadata and statistics
- Analyze sentiment and emotions
- Detect rhetorical patterns (if applicable)
- Generate synthesis report

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  Content Analysis Agent                      │
│                                                             │
│  Step 1: Document Ingestion                                 │
│  ├─► document-parser (if buffer provided)                   │
│  └─► document-metadata                                      │
│                                                             │
│  Step 2: Content Analysis (parallel-capable)                │
│  ├─► sentiment-analyzer                                     │
│  │                                                          │
│  Step 3: Decision Point                                     │
│  │   Is document argumentative/persuasive?                  │
│  │   └─► Check genre markers                                │
│  │                                                          │
│  Step 4: Rhetoric Analysis (conditional)                    │
│  └─► rhetoric-analyzer (if persuasive/academic/dialogic)    │
│                                                             │
│  Step 5: Synthesis                                          │
│  └─► Combine all results into report                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes* | Plain text to analyze |
| buffer | Buffer | no | Raw file buffer (alternative to text) |
| filename | string | no | Source filename |
| mimetype | string | no | File MIME type (if buffer provided) |
| exemplarStorePath | string | no | Path to exemplar store for rhetoric |
| emotions | string[] | no | Specific emotions to detect |
| skipRhetoric | boolean | no | Force skip rhetoric analysis |
| forceRhetoric | boolean | no | Force rhetoric analysis |

*Either `text` or `buffer` must be provided

## Outputs

| Name | Type | Description |
|------|------|-------------|
| document | object | Metadata, statistics, characteristics |
| sentiment | object | Sentiment classification and scores |
| rhetoric | object | Rhetoric analysis (if performed) |
| synthesis | object | Combined analysis summary |

## Decision Points

| Condition | Action |
|-----------|--------|
| Buffer provided | Parse document first |
| Genre is persuasive/academic | Enable rhetoric analysis |
| Document is dialogic (2+ speakers) | Use speaker-turn segmentation |
| skipRhetoric=true | Skip rhetoric analysis |
| forceRhetoric=true | Force rhetoric analysis |

## Example Usage

```typescript
import { contentAnalysisAgent } from '../agents/content-analysis';

// Analyze text directly
const result = await contentAnalysisAgent.execute({
  text: 'Document content here...',
  emotions: ['joy', 'trust'],
});

// Analyze uploaded file
const fileResult = await contentAnalysisAgent.execute({
  buffer: fileBuffer,
  filename: 'report.pdf',
  mimetype: 'application/pdf',
  exemplarStorePath: 'data/exemplars/starter.json',
});

if (result.success) {
  console.log(result.data.synthesis.summary);
}
```

## Required Skills

- document-parser
- document-metadata
- sentiment-analyzer
- rhetoric-analyzer (optional)
