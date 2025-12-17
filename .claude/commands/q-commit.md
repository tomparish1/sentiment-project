---
description: Validate, stage, and commit changes
---

# Commit Command

Execute the following steps to commit changes:

## Step 1: TypeScript Validation (GATE)

Run validation for the project:

```bash
npx tsc --noEmit
```

**If errors are found:** STOP. Show the errors and fix them before proceeding. Do not continue to Step 2.

**If validation passes:** Continue silently to Step 2.

## Step 2: Show Changes

Run `git status` to show what will be committed.

Then ask: **"Ready to commit these changes?"**

## Step 3: Commit (only after user confirms)

1. Stage all changes: `git add .`
2. Commit with a concise message and point-form highlights:
   ```
   git commit -m "Title

   - Point 1
   - Point 2

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
   ```
3. Verify with `git status`

## Step 4: Done

Do NOT push to remote unless explicitly requested.
