---
description: Complete end-of-session workflow
argument-hint: ''
---

# End Session Workflow

**Purpose:** Simplified end-of-session workflow that captures learnings and documents work. Creates session files and optionally updates documentation before committing.

Execute the following steps in order:

## Step 1: Create Session Files

1. Execute `/q-learnings` command
2. Execute `/q-dump` command
3. Execute `/q-prompts` command

## Step 2: PLAN.md Update

**Ask user:** "Does PLAN.md need updating?"

**Assessment checklist:**

- Were any phase subtasks completed?
- Does the "Current Status" section need updating?
- Does "Next Priority" need to change?

**If YES:** Run `/q-update` then proceed to Step 3

**If NO:** Skip to Step 3

## Step 3: Testing Documentation Update

**Ask user:** "Were any tests added or changed this session?"

**Assessment checklist:**

- New test files created?
- New test cases added to existing files?
- Test count changed?
- Test coverage areas expanded?

**If YES:** Update `docs/reference/CLI-TESTING.md`:

- Add new test files to the appropriate module table
- Add "key test areas" section for significant new test suites
- Update test count at bottom of file

**If NO:** Skip to Step 4

## Step 4: CLI/Commands Documentation Update

**Ask user:** "Were any CLI commands, npm scripts, or API endpoints added/changed?"

**Assessment checklist:**

- New npm scripts added to package.json?
- New CLI command options?
- New API endpoints?
- Changed command behavior?

**If YES:** Update CLI documentation:

1. **CLI-QUICKREF.md** (required) - Add/update command syntax
2. **CLI-REFERENCE.md** (if significant) - Add extended documentation, examples, endpoint tables

**IMPORTANT:** Changes to CLI-QUICKREF.md often require corresponding updates to CLI-REFERENCE.md. CLI-QUICKREF is the authoritative syntax reference; CLI-REFERENCE provides extended documentation and examples for the same commands.

**If NO:** Skip to Step 5

## Step 5: Commit Prompt

Display summary and ask about commit:

```
Session Files Created

Learnings: docs/sessions/2025-12/2025-12-13_14-30-00 Learnings.md
Dev Log:   docs/sessions/2025-12/2025-12-13_14-30-00 Dev.md
Prompts:   docs/sessions/2025-12/2025-12-13_14-30-00 Prompts.md

Documentation Updates:
- PLAN.md: [Updated/Already current]
- CLI-TESTING.md: [Updated/Already current]
- CLI-QUICKREF.md: [Updated/Already current]
- CLI-REFERENCE.md: [Updated/Already current]

Current Status: Phase [N.x] - [Phase Name]
Next: [Next immediate task]

Would you like to run `/q-commit` to commit all changes?
```
