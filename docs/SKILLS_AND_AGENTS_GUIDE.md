# Future Architecture: Skills and Agents

## Educational Guide for the Sentiment & Rhetoric Analyzer

This document explains how the features in PLAN.md could be better architected as a system of **Skills** and **Agents** in a future version. This modular approach enables reusability, composability, and integration with AI-powered orchestration systems.

---

## Current Architecture vs. Skills/Agents Architecture

### Current Monolithic Approach

```
┌─────────────────────────────────────────────┐
│           Sentiment Analyzer                │
│  ┌─────────────────────────────────────┐    │
│  │  File Upload → Parse → Analyze →    │    │
│  │  Metadata → Results → Display       │    │
│  └─────────────────────────────────────┘    │
│         (All tightly coupled)               │
└─────────────────────────────────────────────┘
```

**Problems:**
- Hard to reuse individual components
- Difficult to extend with new capabilities
- Can't easily orchestrate across multiple tools
- Testing requires the full system

### Future Skills/Agents Approach

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENTS                               │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Research Agent  │  │ Content Analysis Agent          │   │
│  │ (orchestrates)  │  │ (orchestrates)                  │   │
│  └────────┬────────┘  └────────────────┬────────────────┘   │
│           │                            │                    │
├───────────┼────────────────────────────┼────────────────────┤
│           │          SKILLS            │                    │
│  ┌────────▼────────┐  ┌────────────────▼───────────────┐    │
│  │ Document Parse  │  │ Sentiment Analysis             │    │
│  │ Skill           │  │ Skill                          │    │
│  └─────────────────┘  └────────────────────────────────┘    │
│  ┌─────────────────┐  ┌────────────────────────────────┐    │
│  │ Rhetoric        │  │ Document Metadata              │    │
│  │ Analysis Skill  │  │ Skill                          │    │
│  └─────────────────┘  └────────────────────────────────┘    │
│  ┌─────────────────┐  ┌────────────────────────────────┐    │
│  │ Web Research    │  │ Embedding Engine               │    │
│  │ Skill           │  │ Skill                          │    │
│  └─────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Each skill is independently usable and testable
- Agents can compose skills for complex workflows
- Easy to add new skills without touching existing code
- Skills can be shared across multiple agents/projects

---

## What Are Skills?

A **Skill** is a focused, self-contained capability with:

1. **Clear Purpose** - Does one thing well
2. **Defined Interface** - Explicit inputs and outputs
3. **Documentation** - When and how to use it
4. **Independence** - Works without other skills

### Example: Decomposing Current Features into Skills

| Current Feature | As a Skill | Purpose |
|-----------------|------------|---------|
| File Upload + Parse | `document-parser` | Extract text from PDF, DOCX, MD, TXT |
| Document Metadata | `document-metadata` | Extract title, authors, statistics |
| Sentiment Analysis | `sentiment-analyzer` | Classify positive/negative/neutral |
| Emotion Detection | `emotion-detector` | Score emotional content |
| Genre Detection | `genre-classifier` | Identify academic, conversational, etc. |
| Speaker Detection | `speaker-extractor` | Find speakers in transcripts |
| Rhetoric Analysis | `rhetoric-analyzer` | Classify rhetorical moves |
| Embedding Engine | `embedding-engine` | Generate text embeddings |
| Exemplar Store | `exemplar-manager` | Store and search exemplars |

### Skill Definition Template

Each skill would have a `SKILL.md` file:

```markdown
# Skill: sentiment-analyzer

## Purpose
Analyze text sentiment using Claude API, returning classification
with confidence scores and key indicators.

## When to Use
- User asks about the tone or feeling of text
- Analyzing customer feedback or reviews
- Pre-processing for emotion analysis

## Inputs
| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | Text to analyze (max 200K chars) |
| emotions | string[] | no | Specific emotions to detect |

## Outputs
| Name | Type | Description |
|------|------|-------------|
| sentiment | string | "positive", "negative", or "neutral" |
| confidence | number | 0-1 confidence score |
| indicators | string[] | Key emotional words found |
| explanation | string | Human-readable analysis |
| emotions | object | Emotion intensity scores (if requested) |

## Example Usage
```python
from skills import sentiment_analyzer

result = sentiment_analyzer.analyze(
    text="I loved this product!",
    emotions=["joy", "trust"]
)
# Returns: {sentiment: "positive", confidence: 0.92, ...}
```

## Dependencies
- Claude API access
- None (self-contained)

## Error Handling
- Returns error if text exceeds 200K characters
- Returns error if API unavailable
```

---

## What Are Agents?

An **Agent** is an orchestrator that:

1. **Coordinates Skills** - Calls multiple skills in sequence or parallel
2. **Maintains Context** - Tracks state across skill invocations
3. **Makes Decisions** - Chooses which skills to invoke based on context
4. **Handles Complexity** - Manages multi-step workflows

### Example: Research Analyst Agent

```markdown
# Agent: research-analyst

## Purpose
Conduct comprehensive document analysis combining multiple
analytical perspectives.

## Capabilities
- Parse uploaded documents
- Extract metadata and statistics
- Analyze sentiment and emotions
- Identify rhetorical patterns
- Generate synthesis report

## Workflow

1. **Document Ingestion**
   - Invoke: `document-parser`
   - Invoke: `document-metadata`

2. **Content Analysis** (parallel)
   - Invoke: `sentiment-analyzer`
   - Invoke: `emotion-detector`
   - Invoke: `genre-classifier`

3. **Rhetoric Analysis** (if applicable)
   - Check: Is document argumentative?
   - If yes, invoke: `rhetoric-analyzer`

4. **Synthesis**
   - Combine all skill outputs
   - Generate narrative summary
   - Produce structured report

## Decision Points

| Condition | Action |
|-----------|--------|
| Document is transcript | Use speaker-turn segmentation |
| Document > 10K words | Summarize before rhetoric analysis |
| Low sentiment confidence | Flag for human review |
| Multiple speakers detected | Enable comparative analysis |

## State Management
- Maintains document context across steps
- Caches intermediate results
- Tracks provenance for citations
```

---

## How Skills and Agents Work Together

### Scenario: Analyzing a Podcast Transcript

```
User uploads: "tech-podcast-ep42.txt"
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Content Analysis Agent                     │
│                                                         │
│  Step 1: Parse Document                                 │
│  ├─► document-parser.parse(file)                        │
│  │   Returns: { text: "...", format: "txt" }            │
│  │                                                      │
│  Step 2: Extract Metadata                               │
│  ├─► document-metadata.analyze(text)                    │
│  │   Returns: { speakers: ["HOST", "GUEST"],            │
│  │              isDialogic: true,                       │
│  │              wordCount: 8500 }                       │
│  │                                                      │
│  Step 3: Decision - Transcript detected                 │
│  │   → Use speaker-turn segmentation                    │
│  │   → Enable speaker-specific analysis                 │
│  │                                                      │
│  Step 4: Parallel Analysis                              │
│  ├─► sentiment-analyzer.analyze(text)                   │
│  ├─► emotion-detector.analyze(text, emotions=[...])     │
│  ├─► rhetoric-analyzer.analyze(text, preset="transcript")│
│  │                                                      │
│  Step 5: Per-Speaker Analysis                           │
│  ├─► For each speaker:                                  │
│  │   └─► sentiment-analyzer.analyze(speaker_text)       │
│  │                                                      │
│  Step 6: Synthesize Results                             │
│  └─► Generate comparative report                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        Comprehensive Analysis Report
        - Overall sentiment: Positive (0.78)
        - HOST: More formal, analytical
        - GUEST: Enthusiastic, uses appeals to ethos
        - Top rhetorical moves: contrast (12),
          concession (8), amplification (6)
```

---

## Benefits of This Architecture

### 1. Reusability
```
┌─────────────────┐     ┌─────────────────┐
│ Research Agent  │     │ Review Agent    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────┬───────────────┘
                 │
         ┌───────▼───────┐
         │  sentiment-   │  ← Same skill, different agents
         │  analyzer     │
         └───────────────┘
```

### 2. Testability
```python
# Test skills in isolation
def test_sentiment_analyzer():
    result = sentiment_analyzer.analyze("I love this!")
    assert result.sentiment == "positive"
    assert result.confidence > 0.8

# Test agents with mocked skills
def test_research_agent():
    with mock_skill('sentiment-analyzer', return_value=mock_result):
        agent_result = research_agent.analyze(document)
        assert agent_result.steps_completed == 4
```

### 3. Extensibility
```
# Adding a new skill doesn't affect existing code

skills/
├── sentiment-analyzer/    ← existing
├── emotion-detector/      ← existing
├── rhetoric-analyzer/     ← existing
└── toxicity-detector/     ← NEW! Just add it
    ├── SKILL.md
    └── invoke.py
```

### 4. Composability
```python
# Build custom workflows by combining skills

async def custom_analysis(text):
    # Run in parallel
    sentiment, emotions, rhetoric = await asyncio.gather(
        sentiment_analyzer.analyze(text),
        emotion_detector.analyze(text),
        rhetoric_analyzer.analyze(text),
    )

    # Combine results
    return synthesize(sentiment, emotions, rhetoric)
```

---

## Implementation Roadmap

### Phase 1: Extract Skills from Current Code
- Refactor `sentimentService.ts` → `sentiment-analyzer` skill
- Refactor `documentAnalyzer.ts` → `document-metadata` skill
- Refactor `fileParser.ts` → `document-parser` skill
- Create skill interface definitions

### Phase 2: Build Skill Registry
- Skill discovery and loading
- Input/output validation
- Skill versioning
- Dependency management

### Phase 3: Create Agent Framework
- Agent definition format
- Workflow execution engine
- State management
- Error handling and recovery

### Phase 4: Add Rhetoric Analysis
- Implement embedding engine skill
- Implement exemplar store skill
- Implement rhetoric analyzer skill
- Create rhetoric-focused agent

### Phase 5: Integration
- Web UI for skill invocation
- Agent orchestration interface
- Result visualization
- Skill marketplace/sharing

---

## Mapping PLAN.md Components to Skills

| PLAN.md Component | Skill Name | Notes |
|-------------------|------------|-------|
| `src/config.py` | `skill-config` | Shared config management |
| `src/engine.py` | `embedding-engine` | Core embedding computation |
| `src/store.py` | `exemplar-store` | Exemplar CRUD and search |
| `src/segmentation.py` | `text-segmenter` | Text chunking strategies |
| `src/analyzer.py` | `rhetoric-analyzer` | Main analysis skill |
| `src/results.py` | `result-manager` | Result persistence |
| `src/cli.py` | N/A | CLI is consumer, not skill |

---

## Conclusion

The features outlined in PLAN.md are excellent candidates for a Skills/Agents architecture because:

1. **They're naturally modular** - Embedding, segmentation, classification are distinct concerns
2. **They compose well** - Rhetoric analysis needs embeddings, which needs segmentation
3. **They have clear interfaces** - Input text, output classifications
4. **They're reusable** - Same embedding engine for multiple analysis types

By building with Skills and Agents from the start (or refactoring toward it), you create a system that:
- Scales with complexity
- Adapts to new requirements
- Integrates with AI orchestration
- Enables sophisticated multi-step workflows

This architecture transforms a single-purpose analyzer into a flexible platform for text analysis that can grow with your Writer's Portal vision.
