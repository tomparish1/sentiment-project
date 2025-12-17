---
description: Resume work by analyzing PLAN.md and current progress
argument-hint: ""
---

# Resume Work Session

**Purpose:** Analyze PLAN.md to understand current progress and help you resume work efficiently.

## Actions

1. **Read PLAN.md** to identify:
   - Completed phases (summary only)
   - In-progress phase with status table
   - Pending phases
   - Next steps list

2. **Analyze Progress**:
   - Count COMPLETE vs PENDING steps in current phase
   - Identify the next actionable step
   - Note any blockers or open questions mentioned

3. **Present Context** in this format:

```
Current Position
────────────────

In Progress: Phase [N] - [Phase Name]
   Progress: [X] of [Y] steps complete

   Completed:
   - [List completed steps]

   Remaining:
   - [Next immediate step with details]
   - [Subsequent steps]

Last Completed: Phase [N] - [Phase Name]

Next Planned: Phase [N] - [Phase Name]

────────────────
Recommended Action

[Specific, actionable next step based on current progress]

Example:
"Continue with step 7.3: Manual Testing - start with cross-browser testing"

or

"Complete remaining subtask: Add email delivery verification"

────────────────
Quick Context

[1-2 sentence summary of what this phase accomplishes]

────────────────

Ready to start? (Y/n)
```

4. **Wait for user confirmation** before proceeding

5. **If user confirms**:
   - Offer to help with the next task
   - Ask if they need any files opened or context reviewed
   - Check if there are any blockers to address first

## Example Response

```
Current Position
────────────────

In Progress: Phase 7 - Testing & Quality Assurance
   Progress: 3 of 4 steps complete (75%)

   Completed:
   - 7.1 Unit Tests (61 tests passing)
   - 7.2 E2E Tests (Playwright configured)
   - 7.4 Performance Optimization

   Remaining:
   - 7.3 Manual Testing
     - [ ] Cross-browser testing (Chrome, Firefox, Safari)
     - [ ] Mobile responsiveness (iOS, Android)
     - [ ] Admin panel verification
     - [ ] Email delivery verification

Last Completed: Phase 6 - Email & Communications

Next Planned: Phase 8 - Deployment & Launch Preparation

────────────────
Recommended Action

Start manual testing checklist:
1. Open the site in Chrome, Firefox, and Safari
2. Test critical user flows (browse, add to cart, checkout)
3. Document any issues found

────────────────
Quick Context

Phase 7 ensures quality before launch through automated and manual testing. Manual testing covers browser compatibility and real-world usage scenarios that automated tests may miss.

────────────────

Ready to start? (Y/n)
```

## Notes

- Focus on **next actionable step**, not high-level strategy
- Include **specific file paths** and commands when relevant
- Highlight **blockers** that need resolution before continuing
- Keep context brief but sufficient to resume without reading entire PLAN.md
