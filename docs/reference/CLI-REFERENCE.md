# CLI Reference

Detailed documentation of all CLI commands available in this project.

---

## Table of Contents

- [Development Commands](#development-commands)
- [Build Commands](#build-commands)
- [Test Commands](#test-commands)

---

## Development Commands

### `npm run dev`

**Purpose:** Start the development server with hot reload.

**Usage:**
```bash
npm run dev
```

**Options:** None

**Example Output:**
```
Server running at http://localhost:3000
```

---

## Build Commands

<!-- Document build-related commands here -->

---

## Test Commands

### `npm test`

**Purpose:** Run all Vitest tests.

**Usage:**
```bash
npm test
```

### `npx tsx scripts/test-skills.ts`

**Purpose:** Run Phase 2 skills validation tests.

### `npx tsx scripts/test-agents.ts`

**Purpose:** Run agent framework validation tests.

---

## API Endpoints

### Skills API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List all available skills |
| GET | `/api/skills/:name` | Get skill metadata |
| POST | `/api/skills/:name/invoke` | Invoke a skill with JSON body |
| POST | `/api/skills/document-parser/invoke/file` | Parse uploaded file |
| POST | `/api/skills/rhetoric-analyzer/analyze` | Analyze rhetoric in text |

### Agents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all available agents |
| GET | `/api/agents/:name` | Get agent metadata |
| POST | `/api/agents/content-analysis/execute` | Run content analysis |
| POST | `/api/agents/content-analysis/execute/file` | Analyze uploaded file |
| POST | `/api/agents/research-analyst/execute` | Run research analysis |
| POST | `/api/agents/research-analyst/execute/file` | Analyze uploaded file |

---

*Last updated: 2025-12-18*
