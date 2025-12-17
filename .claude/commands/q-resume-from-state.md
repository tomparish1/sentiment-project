---
description: Resume work from saved state after /compact
argument-hint: ""
---

# Resume From Saved State

**Purpose:** Resume work exactly where you left off after a `/compact` operation, using the state file created by `/q-save-state`.

## Actions

1. **Read the state file** at `docs/sessions/RESUME-STATE.md`

2. **Verify state file exists**:
   - If missing, fall back to `/q-resume` (reads PLAN.md instead)
   - If found, proceed with precise resume

3. **Present resume context** in this format:

```
🔄 Resuming From Saved State
────────────────────────────

📅 State saved: [Timestamp from state file]
📋 Session: [Session number]

📍 Where We Were
────────────────
Phase: [Phase from state file]
Task: [Subtask from state file]
Progress: [What was completed]

🎯 Next Action
──────────────
[Exact next step from state file]

📂 Files In Progress
────────────────────
[List of files being modified]

💡 Key Context
──────────────
[Important context/decisions from state file]

────────────────────────────

Ready to continue? (Y/n)
```

4. **On confirmation**:
   - Restore todo list if captured in state
   - Open relevant files if needed
   - Begin the next action immediately

5. **Clean up** (optional):
   - After successful resume, ask if user wants to archive the state file
   - Move to `docs/sessions/archived-states/` if yes

## If State File Not Found

Display:

```
⚠️ No saved state found at docs/sessions/RESUME-STATE.md

This can happen if:
- /q-save-state was not run before /compact
- The state file was deleted or moved

Falling back to /q-resume (reads from PLAN.md)...
```

Then execute `/q-resume` automatically.

## Notes

- This command provides more precise context than `/q-resume` because it captures the exact moment of pause
- The state file contains specific details (file paths, line numbers, decisions) that PLAN.md may not have
- Use this after `/compact` for seamless continuation
- Use `/q-resume` for starting fresh sessions or when state file is unavailable
