---
description: Update all project documentation
argument-hint: ""
---

# Update Project Documentation

Execute at the end of a session to update all project documentation. This command covers four documentation areas - assess each one separately.

---

## 1. Testing Documentation (`CLI-TESTING.md`)

**When to update:** Tests were added, changed, or test count changed

**Update checklist:**
- Add new test files to the appropriate module table (Nodes, Services, Scripts, Utilities)
- Add "key test areas" section for significant new test suites
- Update `**Current Test Count:**` at bottom of file
- Document any new testing patterns or approaches

**File:** `docs/reference/CLI-TESTING.md`

---

## 2. CLI Quick Reference (`CLI-QUICKREF.md`)

**When to update:** Any CLI command, npm script, or command-line option changed

**This is the AUTHORITATIVE reference for command syntax.**

**Update checklist:**
- Add new npm scripts to appropriate section (Development, Build, Testing, etc.)
- Add new CLI command options
- Update any changed command syntax
- Keep descriptions concise (this is a quick reference)

**File:** `docs/reference/CLI-QUICKREF.md`

---

## 3. CLI Extended Reference (`CLI-REFERENCE.md`)

**When to update:** Significant new features added that need extended documentation

**IMPORTANT:** Changes to CLI-QUICKREF.md often require corresponding updates here. CLI-QUICKREF has the syntax; CLI-REFERENCE has the details.

**Update checklist:**
- Add detailed documentation for new commands/features
- Include usage examples
- Document API endpoints with request/response details
- Add endpoint tables for new APIs
- Explain implementation details and configuration options

**File:** `docs/reference/CLI-REFERENCE.md`

---

## 4. PLAN.md Progress

**When to update:** Phase subtasks completed, status changed, or priorities shifted

**Update checklist:**
- Mark completed subtasks with `[x]` and ✅
- Update "Current Status" section at top
- Update "Recent Additions" with session accomplishments
- Update "Next Priority" if it changed
- Update "Last Updated" timestamp at bottom

**File:** `PLAN.md`

---

## Documentation Maintenance Rules

**CLI Documentation (two-file system):**
- `CLI-QUICKREF.md` = **Authoritative** for command syntax (always update this first)
- `CLI-REFERENCE.md` = Extended documentation, examples, implementation details

**Trigger → Action mapping:**
| Change Type | CLI-QUICKREF | CLI-REFERENCE | CLI-TESTING | PLAN.md |
|-------------|--------------|---------------|-------------|---------|
| New npm script | ✅ Required | If significant | - | - |
| New CLI option | ✅ Required | If significant | - | - |
| New API endpoint | ✅ Required | ✅ Required | - | - |
| New test file | - | - | ✅ Required | - |
| Test count change | - | - | ✅ Required | - |
| Phase subtask done | - | - | - | ✅ Required |
| New slash command | Update `.claude/commands/` | - | - | - |
