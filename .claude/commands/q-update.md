---
description: Update PLAN.md with current progress
argument-hint: ""
---

# Update PLAN.md

**Purpose:** Keep PLAN.md synchronized with current progress. Run this frequently during development to ensure documentation stays current.

## PLAN.md Structure

The current PLAN.md uses this structure:

```
## Completed Phases
### Phase N: Name
**Purpose:** Brief description
**Status:** COMPLETE

## In Progress
### Phase N: Name
| Step | Status |
|------|--------|
| N.1 Description | COMPLETE |
| N.2 Description | PENDING |

#### N.2 Description - PENDING
- [ ] Subtask details
- [ ] More subtasks

## Pending
### Phase N: Name
(Full details for future phases)

## Next Steps
1. Immediate next action
2. Following action
```

## Actions

1. **Update "In Progress" section:**
   - Update status table (COMPLETE/PENDING for each step)
   - Check off completed subtasks with [x]
   - Add new subtasks discovered during work
   - Document any blockers or issues

2. **If a step completes:**
   - Mark it COMPLETE in the status table
   - Remove its detailed subtask section (or mark all [x])

3. **If a phase completes:**
   - Move full phase details to COMPLETED_PLAN.md
   - In PLAN.md, move to "Completed Phases" with summary only:
     ```
     ### Phase N: Name
     **Purpose:** Brief description
     **Status:** COMPLETE
     ```
   - Promote next "Pending" phase to "In Progress"

4. **Update "Next Steps" section** at bottom with current priorities

5. **Confirm completion** with brief message:

```
PLAN.md Updated

Changes:
- [What was updated]

Current Status:
- Phase: [Current in-progress phase]
- Step: [Current step]
- Progress: [X of Y steps complete]

Next: [Immediate next action]
```

## Example Update

Before:
```
| 7.2 E2E Tests | PENDING |

#### 7.2 E2E Tests - PENDING
- [ ] Set up Playwright
- [ ] Write checkout flow tests
```

After:
```
| 7.2 E2E Tests | COMPLETE |

#### 7.2 E2E Tests - COMPLETE
- [x] Set up Playwright
- [x] Write checkout flow tests
```
