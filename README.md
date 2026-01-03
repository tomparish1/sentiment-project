# Writer's Portal

A modular document analysis platform with agents, skills, and natural language interface. Powered by Claude AI.

**Current Version:** v0.5.0

## Overview

Writer's Portal provides comprehensive document analysis through a composable architecture:

- **Agents** orchestrate complex, multi-step analysis workflows
- **Skills** provide focused, reusable capabilities
- **NLP Interface** (planned) enables natural language interaction with all capabilities

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Web UI / API                        │
├─────────────────────────────────────────────────────┤
│                    Agents                            │
│  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │ Content Analysis│  │ Research Analyst        │   │
│  └─────────────────┘  └─────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                    Skills                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Document │ │Sentiment │ │ Rhetoric │ │  Text  │ │
│  │  Parser  │ │ Analyzer │ │ Analyzer │ │Segment │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────┘
```

## Available Agents

### Content Analysis Agent
Comprehensive document analysis including sentiment, emotions, and rhetoric.

**Capabilities:**
- Document parsing (PDF, DOCX, TXT, MD)
- Metadata extraction (word count, reading time, genre detection)
- Sentiment analysis with emotion detection
- Rhetoric analysis (when appropriate)
- Synthesis report generation

### Research Analyst Agent
Deep analysis for dialogic documents with speaker identification.

**Capabilities:**
- Speaker identification and separation
- Per-speaker sentiment analysis
- Speaker comparison and dynamics
- Notable quote extraction
- Research report generation

## Available Skills

| Skill | Description |
|-------|-------------|
| `document-parser` | Extract text from PDF, DOCX, TXT, MD files |
| `document-metadata` | Extract statistics, detect genre, identify speakers |
| `sentiment-analyzer` | Analyze sentiment with 10 emotion types |
| `rhetoric-analyzer` | Classify rhetorical moves using exemplar matching |
| `text-segmenter` | Break text into sentences, paragraphs, or speaker turns |
| `embedding-engine` | Generate embeddings for similarity matching |
| `exemplar-store` | Manage rhetoric exemplars |

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
```bash
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=your_key_here
```

### 3. Start the Server
```bash
npm run dev
```

The portal will be available at `http://localhost:3000`

## Usage

### Web Portal
Open `http://localhost:3000/portal.html` for the main interface.

### API Endpoints

#### Agents
```bash
# List agents
GET /api/agents

# Execute content analysis
POST /api/agents/content-analysis/execute
Content-Type: application/json
{ "text": "Your document text..." }

# Execute with file upload
POST /api/agents/content-analysis/execute/file
Content-Type: multipart/form-data
file: <your-file>
```

#### Skills
```bash
# List skills
GET /api/skills

# Invoke a skill
POST /api/skills/{skill-name}/invoke
Content-Type: application/json
{ ...skill-specific-input }
```

#### Documentation
```bash
GET /api/docs      # Swagger UI
GET /api/docs.json # OpenAPI spec
```

## Project Structure

```
writers-portal/
├── agents/                 # Agent implementations
│   ├── content-analysis/
│   ├── research-analyst/
│   ├── registry.ts        # Agent discovery
│   └── types.ts           # Agent interfaces
├── skills/                 # Skill implementations
│   ├── document-parser/
│   ├── sentiment-analyzer/
│   ├── rhetoric-analyzer/
│   ├── registry.ts        # Skill discovery
│   └── types.ts           # Skill interfaces
├── src/
│   ├── api/               # Express routes
│   ├── config/            # Configuration
│   └── index.ts           # Entry point
├── public/                # Web UI
│   └── portal.html        # Main portal interface
├── data/
│   └── exemplars/         # Rhetoric exemplars
├── docs/
│   ├── specs/             # Technical specifications
│   └── reference/         # API reference
└── tests/                 # Test suites
```

## Documentation

- [Skills & Agents Guide](./docs/SKILLS_AND_AGENTS_GUIDE.md)
- [NLP Front-End Specification](./docs/specs/NLP_FRONTEND_SPECIFICATION.md)
- [Rhetoric Analyzer Spec](./docs/specs/RHETORIC_ANALYZER_SPEC.md)
- [Embedding Analyzer Spec](./docs/specs/EMBEDDING_ANALYZER_SPEC.md)

## Development

### Scripts
```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # Type checking
```

### Adding a New Skill
1. Create directory: `skills/your-skill/`
2. Implement: `schema.ts`, `invoke.ts`, `index.ts`
3. Register in `skills/registry.ts`

### Adding a New Agent
1. Create directory: `agents/your-agent/`
2. Implement: `schema.ts`, `agent.ts`, `index.ts`
3. Register in `agents/registry.ts`

## Roadmap

### Current (v0.5.0)
- Agents & Skills architecture
- Content analysis and research agents
- 7 composable skills
- REST API with Swagger docs

### Next (v0.6.0) - NLP Interface
- Natural language query processing
- Conversational context management
- Chat-based UI

### Future
- Integration with transcription services
- Additional analysis agents
- Plugin system for external skills

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |

## License

ISC
