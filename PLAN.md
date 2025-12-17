# Project Plan

## Overview

Embedding Rhetoric Analyzer - A standalone embedding-based rhetorical move analyzer designed for integration into larger systems. Learns from user-curated exemplars, adapts to any writing genre, and provides extensible interfaces for CLI, file upload, and future web/research tools.

**Spec Document:** RHETORIC_ANALYZER_SPEC.md
**Integration Target:** Writer's Portal

## Current Status

**Phase:** Step 1 - Core Implementation
**Next Priority:** Create project structure and implement config.py

---

## Plan Steps

<!-- Steps will be numbered sequentially. When completed, move details to COMPLETED_PLAN.md and replace with summary. -->

### Step 1: Core Implementation

**Purpose:** Build the standalone embedding-based rhetorical move analyzer
**Status:** Not Started

#### Sub-tasks

- [ ] 1.1 Create project structure per spec
- [ ] 1.2 Create pyproject.toml with dependencies
- [ ] 1.3 Create src/__init__.py
- [ ] 1.4 Implement src/config.py
- [ ] 1.5 Test configuration serialization
- [ ] 1.6 Create configs/default.json
- [ ] 1.7 Implement src/engine.py
- [ ] 1.8 Test model loading and encoding
- [ ] 1.9 Test similarity computation
- [ ] 1.10 Implement src/store.py
- [ ] 1.11 Test add/remove/search operations
- [ ] 1.12 Test JSON persistence
- [ ] 1.13 Implement src/segmentation.py
- [ ] 1.14 Test sentence segmentation
- [ ] 1.15 Test paragraph segmentation
- [ ] 1.16 Test speaker turn segmentation
- [ ] 1.17 Implement src/results.py
- [ ] 1.18 Test persistence and loading
- [ ] 1.19 Implement src/analyzer.py
- [ ] 1.20 Integration test with all components
- [ ] 1.21 Implement src/cli.py
- [ ] 1.22 Test analyze command
- [ ] 1.23 Test exemplars commands
- [ ] 1.24 Test config commands
- [ ] 1.25 Create data/exemplars/starter.json
- [ ] 1.26 Test exemplar import

#### Deliverables

- Working CLI tool (`rhetoric` command)
- Core Python modules: config, engine, store, segmentation, results, analyzer, cli
- Starter exemplar collection
- pyproject.toml with dependencies

#### Notes

- See RHETORIC_ANALYZER_SPEC.md for full implementation code
- Uses sentence-transformers for embeddings
- JSON-based configuration and storage

---

### Step 2: Testing & Documentation

**Purpose:** Ensure reliability and usability
**Status:** Not Started

#### Sub-tasks

- [ ] 2.1 Create tests/test_engine.py
- [ ] 2.2 Create tests/test_store.py
- [ ] 2.3 Create tests/test_analyzer.py
- [ ] 2.4 Create tests/test_segmentation.py
- [ ] 2.5 End-to-end CLI testing
- [ ] 2.6 Batch processing tests
- [ ] 2.7 Create README.md with usage examples
- [ ] 2.8 Update CLI-REFERENCE.md
- [ ] 2.9 Update CLI-QUICKREF.md

#### Deliverables

- Complete test suite with coverage
- README.md documentation
- CLI documentation updates

#### Notes

- Use pytest for testing
- Aim for >80% code coverage

---

### Step 3: Skill Extraction (Future)

**Purpose:** Convert to modular skill for Writer's Portal integration
**Status:** Future

#### Sub-tasks

- [ ] 3.1 Create skills/rhetoric-analysis/SKILL.md
- [ ] 3.2 Add Python invoke interface
- [ ] 3.3 Define JSON schema for inputs/outputs
- [ ] 3.4 Build research-analyst agent
- [ ] 3.5 Add web-research and inference skills
- [ ] 3.6 Create orchestration workflows

#### Deliverables

- SKILL.md with Claude instructions
- invoke.py Python interface
- schema.json for inputs/outputs
- Research analyst agent workflow

#### Notes

- Skills are focused capabilities with clear inputs/outputs
- Agents orchestrate multiple skills for complex tasks
- Results persist to shared/results/ for cross-skill access

---

### Step 4: Writer's Portal Integration (Future)

**Purpose:** Full web integration with UI
**Status:** Future

#### Sub-tasks

- [ ] 4.1 Web UI for skill invocation
- [ ] 4.2 Result visualization
- [ ] 4.3 Exemplar curation interface

#### Deliverables

- Web interface for rhetoric analysis
- Visual result display
- Exemplar management UI

#### Notes

- Builds on Step 3 skill architecture
- Exemplar collections can be specialized per domain (podcasts, academic, journalism)

---

## Key Design Decisions

**Result Format:** JSON with full provenance enables skill chaining. Any skill can read rhetoric analysis results.

**Configuration as Data:** JSON configs work across CLI, API, and agents. Skills can override specific settings.

**Exemplar Store:** Shared exemplar collections can be specialized per domain (podcasts, academic, journalism).

**Stateless Skills:** Each skill invocation is self-contained. State lives in persisted results, not in memory.

---

## Quick Reference

| Step | Name | Status |
|------|------|--------|
| 1 | Core Implementation | Not Started |
| 2 | Testing & Documentation | Not Started |
| 3 | Skill Extraction | Future |
| 4 | Writer's Portal Integration | Future |
