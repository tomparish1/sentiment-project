# Session Learnings - Skills-Agents Architecture

**Date:** 2025-12-18
**Context:** Building modular skills/agents architecture from monolithic plan

---

## What Changed

### Architecture Pivot
- Original plan: Monolithic Python rhetoric analyzer
- New approach: TypeScript skills/agents architecture with composable modules

### Skills Created (7 total)
| Skill | Purpose | Category |
|-------|---------|----------|
| document-parser | Extract text from PDF/DOCX/TXT/MD | document |
| document-metadata | Statistics, genre detection, speakers | document |
| sentiment-analyzer | Claude API sentiment analysis | analysis |
| embedding-engine | Text embeddings via transformers.js | embedding |
| text-segmenter | Sentence/paragraph/speaker segmentation | text-processing |
| exemplar-store | CRUD + similarity search for exemplars | storage |
| rhetoric-analyzer | Orchestrates skills for rhetoric classification | analysis |

### Agents Created (2 total)
| Agent | Orchestrates | Purpose |
|-------|-------------|---------|
| content-analysis | parser, metadata, sentiment, rhetoric | Comprehensive document analysis |
| research-analyst | All + per-speaker analysis | Research workflow with speaker comparison |

---

## Why

### Skills-First Approach
1. **Composability** - Skills can be combined in different ways
2. **Testability** - Each skill is independently testable
3. **Reusability** - Same skill used by multiple agents
4. **Incremental development** - Build and validate one skill at a time

### Agents as Orchestrators
1. **Decision making** - Agents decide which skills to invoke based on content
2. **State management** - AgentContext tracks workflow progress
3. **Error resilience** - Graceful degradation when non-critical skills fail
4. **Observability** - Step tracking, timing, decision recording

---

## Trade-offs

### TypeScript Strict Mode
- **Issue:** exactOptionalPropertyTypes caused many type errors
- **Resolution:** Disabled that specific option while keeping other strict checks
- **Trade-off:** Slightly less type safety for undefined handling, but runtime tests pass

### Embedding Library Choice
- **Chose:** @xenova/transformers (transformers.js)
- **Pro:** Pure TypeScript, no Python dependency, runs locally
- **Con:** First invocation downloads model (~30MB), slower than server-side

### Skill Interface Design
- **Chose:** Generic `Skill<TInput, TOutput>` interface with SkillResult wrapper
- **Pro:** Consistent error handling, execution metadata
- **Con:** More boilerplate than plain functions

---

## Patterns Established

### Skill Pattern
```
skills/
└── [skill-name]/
    ├── SKILL.md      # Interface documentation
    ├── schema.ts     # Zod schemas for input/output
    ├── invoke.ts     # Implementation
    └── index.ts      # Exports
```

### Agent Pattern
```
agents/
└── [agent-name]/
    ├── AGENT.md      # Workflow documentation
    ├── schema.ts     # Input/output/state types
    ├── agent.ts      # Implementation with defineWorkflow + execute
    └── index.ts      # Exports
```

### Registry Pattern
- Both skills and agents use a registry for discovery
- `getSkill(name)` / `getAgent(name)` for dynamic access
- `getAllSkillMetadata()` / `getAllAgentMetadata()` for listing

### Helper Functions
- `createSkillResult()` - Consistent result wrapping with timing
- `createAgentContext()` - Initialize workflow state
- `createAgentResult()` - Wrap agent output with metadata
- `updateStep()`, `recordDecision()`, `recordError()` - Context mutations

---

## Key Technical Decisions

### 1. Embeddings for Rhetoric Classification
- Using similarity search against annotated exemplars
- Weighted voting among top-K matches
- Confidence threshold for classification quality

### 2. Agent Decision Points
- Agents record decisions with condition and outcome
- Enables debugging and explaining why certain paths were taken
- Example: "Document is dialogic with 3 speakers" → "run per-speaker analysis"

### 3. API Design
- Skills: `/api/skills/:name/invoke` - Direct invocation
- Agents: `/api/agents/:name/execute` - Workflow execution
- Both support JSON body and file upload variants

### 4. Frontend Architecture
- Vanilla JS + Tailwind CSS (no build step for frontend)
- Tab-based navigation (Analysis, Skills, Exemplars)
- Real-time workflow progress display

---

## Lessons Learned

1. **Start with the interface** - SKILL.md and AGENT.md documentation drove implementation
2. **Test early, test incrementally** - Script-based tests caught issues before integration
3. **Type flexibility vs strictness** - Sometimes relaxing types is pragmatic
4. **Graceful degradation** - Agents continue when non-critical skills fail (e.g., missing API key)
5. **Observability built-in** - Step tracking and timing from the start, not added later

---

## Future Considerations

1. **Caching** - Exemplar embeddings could be pre-computed and cached
2. **Parallel skill execution** - Some skills could run concurrently
3. **Skill versioning** - Handle breaking changes to skill interfaces
4. **Agent composition** - Agents that delegate to other agents
5. **Streaming results** - Real-time updates for long-running workflows
