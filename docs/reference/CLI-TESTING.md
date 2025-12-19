# Testing Documentation

Documentation of all tests in this project.

---

## Test Framework

**Framework:** Vitest
**Configuration:** vitest.config.ts (or vite.config.ts)

---

## Test Suites

### Unit Tests

| File | Description | Key Test Areas |
|------|-------------|----------------|

### Integration Tests

| File | Description | Key Test Areas |
|------|-------------|----------------|
| tests/api/skills.test.ts | Skills API endpoints | List skills, get metadata, invoke skills, file parsing |
| tests/api/agents.test.ts | Agents API endpoints | List agents, get metadata, execute agents |

### Script Tests

| File | Description | Key Test Areas |
|------|-------------|----------------|
| scripts/test-skills.ts | Phase 2 skills validation | text-segmenter, embedding-engine, exemplar-store, rhetoric-analyzer |
| scripts/test-agents.ts | Agent framework validation | Registry, content-analysis, research-analyst, workflow context |

### E2E Tests

| File | Description | Key Test Areas |
|------|-------------|----------------|

---

## Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npx vitest

# Run specific test file
npx vitest tests/api/skills.test.ts

# Run script tests
npx tsx scripts/test-skills.ts
npx tsx scripts/test-agents.ts
```

---

## Test Coverage

**Current Coverage:** Not measured
**Target Coverage:** TBD

---

**Total Test Count:** 13 (7 skills + 6 agents integration tests)

*Last updated: 2025-12-18*
