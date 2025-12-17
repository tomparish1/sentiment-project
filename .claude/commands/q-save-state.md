---
description: Save current work state before /compact for seamless resume
argument-hint: ""
---

# Save State Before Compact

**Purpose:** Prepare for a `/compact` operation by saving the current work state so you can resume exactly where you left off.

## What This Command Does

1. **Captures current work state** in a state file
2. **Runs `/q-end-session`** to create session documentation
3. **Instructs you** to run `/compact` manually
4. **Prepares for resume** via `/q-resume-from-state`

## Step 1: Save Current State

Create a state file at `docs/sessions/RESUME-STATE.md` with the following information:

```markdown
# Resume State - [Current Date/Time]

## Session Context
- **Session Number**: [Current session number from existing session files]
- **Saved At**: [ISO timestamp]

## Current Work
- **Phase**: [Current phase from PLAN.md]
- **Subtask**: [Specific subtask being worked on]
- **Progress**: [Brief description of what was just completed]

## Next Action
[Specific next step to take when resuming - be precise with file paths, function names, etc.]

## Todo List State
[Copy of current todo list if active]

## Files Being Modified
[List any files currently being worked on]

## Important Context
[Any critical context needed to resume - decisions made, approaches chosen, etc.]

## Resume Instructions
After `/compact`, run `/q-resume-from-state` to continue from this exact point.
```

## Step 2: Run End Session

Execute `/q-end-session` to:
- Create session learnings file
- Create session dev log
- Create session prompts file
- Optionally update documentation
- Commit changes

## Step 3: Instruct User

After completing Steps 1-2, display:

```
📦 State Saved Successfully

State file: docs/sessions/RESUME-STATE.md

Next steps:
1. Run /compact now
2. After compact completes, run /q-resume-from-state to continue

Your current work:
- Phase: [Phase info]
- Task: [Current task]
- Next: [What to do next]
```

## Notes

- The state file should contain enough detail that Claude can resume without needing to re-read extensive context
- Include specific file paths, line numbers, and function names where relevant
- Capture any decisions or design choices made during the session
