# Project Plan

## Overview

Sentiment & Rhetoric Analyzer - A modular analysis platform built on a Skills/Agents architecture. Features document parsing, sentiment analysis, and rhetoric analysis capabilities designed for composability and integration into larger systems.

**Architecture Guide:** docs/SKILLS_AND_AGENTS_GUIDE.md
**Rhetoric Spec:** RHETORIC_ANALYZER_SPEC.md
**Integration Target:** Writer's Portal

## Current Status

**Phase:** Phase 5 - Writer's Portal Integration (Complete)
**Next Priority:** All phases complete! Future enhancements possible.

---

## Plan Steps

<!-- Skills-first approach: Build modular skills, then compose into agents -->

### Phase 1: Skills Foundation

**Purpose:** Establish the skills architecture by extracting existing functionality
**Status:** Complete

#### Completed

- [x] Create skills directory structure
- [x] Define base Skill interface and types (`skills/types.ts`)
- [x] Create skill registry (`skills/registry.ts`)
- [x] Extract `document-parser` skill from fileParser.ts
- [x] Extract `document-metadata` skill from documentAnalyzer.ts
- [x] Extract `sentiment-analyzer` skill from sentimentService.ts

#### Deliverables

- `skills/` directory with modular skill architecture
- Three foundational skills: document-parser, document-metadata, sentiment-analyzer
- Skill registry for discovery and management
- SKILL.md documentation for each skill

#### Structure Created

```
skills/
├── types.ts              # Base Skill interface
├── registry.ts           # Skill discovery/management
├── index.ts              # Main exports
├── document-parser/
│   ├── SKILL.md
│   ├── schema.ts
│   ├── invoke.ts
│   └── index.ts
├── document-metadata/
│   ├── SKILL.md
│   ├── schema.ts
│   ├── invoke.ts
│   └── index.ts
└── sentiment-analyzer/
    ├── SKILL.md
    ├── schema.ts
    ├── invoke.ts
    └── index.ts
```

---

### Phase 2: Rhetoric Analysis Skill

**Purpose:** Add embedding-based rhetoric analysis as a new skill
**Status:** Complete

#### Completed

- [x] 2.1 Create `skills/embedding-engine/` skill
- [x] 2.2 Create `skills/text-segmenter/` skill
- [x] 2.3 Create `skills/exemplar-store/` skill
- [x] 2.4 Create `skills/rhetoric-analyzer/` skill
- [x] 2.5 Create starter exemplar collection
- [x] 2.6 Update skill registry

#### Deliverables

- `embedding-engine` - Compute embeddings via @xenova/transformers
- `text-segmenter` - Sentence/paragraph/speaker-turn segmentation
- `exemplar-store` - CRUD + similarity search for exemplars
- `rhetoric-analyzer` - Orchestrates above skills for classification
- `data/exemplars/starter.json` - 20 starter exemplars

#### Structure Created

```
skills/
├── embedding-engine/
│   ├── SKILL.md
│   ├── schema.ts
│   ├── invoke.ts
│   └── index.ts
├── text-segmenter/
│   ├── SKILL.md
│   ├── schema.ts
│   ├── invoke.ts
│   └── index.ts
├── exemplar-store/
│   ├── SKILL.md
│   ├── schema.ts
│   ├── invoke.ts
│   └── index.ts
└── rhetoric-analyzer/
    ├── SKILL.md
    ├── schema.ts
    ├── invoke.ts
    └── index.ts

data/exemplars/
└── starter.json        # 20 starter exemplars
```

#### Dependencies Required

```bash
npm install @xenova/transformers
```

#### Notes

- embedding-engine uses @xenova/transformers for local embeddings
- First embedding call downloads model (~30MB)
- Skills compile cleanly with TypeScript

---

### Phase 3: Agent Framework

**Purpose:** Create agent orchestration layer
**Status:** Complete

#### Completed

- [x] 3.1 Define Agent interface and types (`agents/types.ts`)
- [x] 3.2 Create agent registry (`agents/registry.ts`)
- [x] 3.3 Build `content-analysis-agent`
- [x] 3.4 Build `research-analyst-agent`
- [x] 3.5 Workflow execution with step tracking
- [x] 3.6 State management and decision tracking

#### Deliverables

- `agents/types.ts` - Agent, AgentContext, WorkflowStep interfaces
- `agents/registry.ts` - Agent discovery and management
- `content-analysis-agent` - Document + sentiment + rhetoric analysis
- `research-analyst-agent` - Full research workflow with speaker analysis

#### Structure Created

```
agents/
├── types.ts              # Agent interface, context, workflow types
├── registry.ts           # Agent discovery/management
├── index.ts              # Main exports
├── content-analysis/
│   ├── AGENT.md
│   ├── schema.ts
│   ├── agent.ts
│   └── index.ts
└── research-analyst/
    ├── AGENT.md
    ├── schema.ts
    ├── agent.ts
    └── index.ts
```

#### Key Features

- **Workflow Steps**: Track status, timing, results for each step
- **Decision Points**: Record conditional logic and outcomes
- **Error Handling**: Graceful degradation, continue on non-critical errors
- **Context Management**: State accumulation across steps
- **Callbacks**: onStepComplete, onDecision hooks for monitoring

---

### Phase 4: Integration & Testing

**Purpose:** Connect skills/agents to existing API and add comprehensive tests
**Status:** Complete

#### Completed

- [x] 4.1 Create skill API routes (`src/api/skillRoutes.ts`)
- [x] 4.2 Create agent API routes (`src/api/agentRoutes.ts`)
- [x] 4.3 Integrate routes into Express app
- [x] 4.4 Create skills integration tests (`tests/api/skills.test.ts`)
- [x] 4.5 Create agents integration tests (`tests/api/agents.test.ts`)

#### API Endpoints Added

**Skills API:**
- `GET /api/skills` - List all skills
- `GET /api/skills/:name` - Get skill metadata
- `POST /api/skills/:name/invoke` - Invoke a skill
- `POST /api/skills/document-parser/invoke/file` - Parse uploaded file
- `POST /api/skills/rhetoric-analyzer/analyze` - Analyze rhetoric

**Agents API:**
- `GET /api/agents` - List all agents
- `GET /api/agents/:name` - Get agent metadata
- `POST /api/agents/content-analysis/execute` - Run content analysis
- `POST /api/agents/content-analysis/execute/file` - Analyze uploaded file
- `POST /api/agents/research-analyst/execute` - Run research analysis
- `POST /api/agents/research-analyst/execute/file` - Analyze uploaded file

#### Test Results

- Skills API: 7 tests passing
- Agents API: 6 tests passing
- Total: 13 integration tests

#### Notes

- TypeScript strict mode creates some type warnings in skills/agents (runtime works correctly)
- All tests pass, confirming correct behavior
- Sentiment analysis requires `ANTHROPIC_API_KEY` environment variable

---

### Phase 5: Writer's Portal Integration

**Purpose:** Full web integration with UI
**Status:** Complete

#### Completed

- [x] 5.1 Create Writer's Portal page (`public/portal.html`)
- [x] 5.2 Create portal JavaScript (`public/portal.js`)
- [x] 5.3 Content Analysis tab with agent execution
- [x] 5.4 Skills Explorer tab with direct skill invocation
- [x] 5.5 Exemplar Manager tab for curation
- [x] 5.6 Result visualization for rhetoric analysis
- [x] 5.7 Workflow progress display
- [x] 5.8 Navigation links from main page

#### Features

**Content Analysis Tab:**
- Agent type selection (content-analysis, research-analyst)
- Text input or file upload
- Workflow progress with execution details
- Synthesis summary with key findings
- Document statistics display
- Rhetoric moves visualization with confidence bars
- Speaker analysis for transcripts
- Research report display

**Skills Explorer Tab:**
- List all 7 available skills with categories
- Click to select skill for invocation
- Dynamic input forms per skill type
- JSON result display

**Exemplar Manager Tab:**
- Exemplar statistics dashboard
- List all exemplars with move type/category
- Add new exemplar form
- Auto-save to exemplar store

#### Files Created

- `public/portal.html` - Writer's Portal UI
- `public/portal.js` - Portal JavaScript

---

## Key Design Decisions

**Skills Architecture:** Each skill is self-contained with clear inputs/outputs, enabling composition and reuse.

**Result Format:** SkillResult wrapper with success/error handling and execution metadata.

**Skill Registry:** Centralized discovery allows dynamic skill loading and introspection.

**Stateless Skills:** Each skill invocation is self-contained. State lives in persisted results, not in memory.

---

## Quick Reference

| Phase | Name | Status |
|-------|------|--------|
| 1 | Skills Foundation | Complete |
| 2 | Rhetoric Analysis Skill | Complete |
| 3 | Agent Framework | Complete |
| 4 | Integration & Testing | Complete |
| 5 | Writer's Portal Integration | Complete |

**All 5 phases complete!**
