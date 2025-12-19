# Agent: research-analyst

## Purpose

Conduct in-depth research analysis with speaker-level insights, comparative
analysis, and comprehensive reporting. Specialized for transcripts, interviews,
and multi-voice documents.

## Capabilities

- All content-analysis capabilities
- Per-speaker sentiment analysis (for transcripts)
- Speaker comparison and dynamics
- Detailed rhetoric breakdown by speaker
- Research-oriented summary with citations

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  Research Analyst Agent                      │
│                                                              │
│  Step 1: Document Analysis                                   │
│  ├─► document-parser (if buffer)                             │
│  └─► document-metadata                                       │
│                                                              │
│  Step 2: Speaker Detection                                   │
│  └─► Identify speakers from metadata                         │
│                                                              │
│  Step 3: Overall Analysis                                    │
│  ├─► sentiment-analyzer (full document)                      │
│  └─► rhetoric-analyzer (full document)                       │
│                                                              │
│  Step 4: Per-Speaker Analysis (if dialogic)                  │
│  └─► For each speaker:                                       │
│      ├─► Extract speaker segments                            │
│      └─► sentiment-analyzer (speaker text)                   │
│                                                              │
│  Step 5: Comparative Analysis                                │
│  └─► Compare speakers on sentiment, rhetoric                 │
│                                                              │
│  Step 6: Research Report                                     │
│  └─► Generate detailed research report                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes* | Plain text to analyze |
| buffer | Buffer | no | Raw file buffer (alternative to text) |
| filename | string | no | Source filename |
| mimetype | string | no | File MIME type |
| exemplarStorePath | string | no | Path to exemplar store |
| emotions | string[] | no | Emotions to detect |
| maxSpeakers | number | no | Limit speaker analysis (default: 5) |
| includeQuotes | boolean | no | Include notable quotes (default: true) |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| document | object | Metadata and characteristics |
| overall | object | Overall sentiment and rhetoric |
| speakers | object[] | Per-speaker analysis |
| comparison | object | Comparative analysis |
| report | object | Research report with findings |

## Example Usage

```typescript
import { researchAnalystAgent } from '../agents/research-analyst';

const result = await researchAnalystAgent.execute({
  text: transcriptText,
  exemplarStorePath: 'data/exemplars/starter.json',
  emotions: ['trust', 'anticipation'],
  includeQuotes: true,
});

if (result.success) {
  console.log(result.data.report.executiveSummary);
  console.log(result.data.comparison.dynamics);
}
```

## Required Skills

- document-parser
- document-metadata
- sentiment-analyzer
- text-segmenter
- rhetoric-analyzer
