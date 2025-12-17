---
description: Document session learnings
argument-hint: "[context] - optional: deployment, refactor, testing, etc."
---

# Document Session Learnings

Create a session learnings document:

1. **Get current timestamp** (run these bash commands):
   ```bash
   date '+%Y-%m'          # MONTH (for directory)
   date '+%Y-%m-%d_%H-%M-%S'  # FILENAME (for file)
   ```

2. **Check for context argument:**
   - If `$ARGUMENTS` is provided (e.g., "deployment"), this is a context-specific learnings document
   - If no argument, this is a general session learnings document

3. **Create the file:**
   - Directory: `docs/sessions/ABC/` (where `ABC` is MONTH from step 1)
   - Filename format:
     - With context: `XYZ Learnings - CONTEXT.md` (e.g., `2025-12-14_13-00-00 Learnings - Deployment.md`)
     - Without context: `XYZ Learnings.md` (e.g., `2025-12-14_13-00-00 Learnings.md`)

4. **Document the learnings based on context:**

   **If context is "deployment":**
   - Use sections: Issue Encountered, Root Cause, Fix Applied, Prevention/Future Notes
   - Focus on deployment-specific lessons (environment differences, build issues, config problems)

   **If context is "refactor":**
   - Use sections: What Changed, Why, Trade-offs, Patterns Established

   **If context is "testing":**
   - Use sections: Test Gaps Found, Coverage Improvements, Testing Patterns

   **If no context (general):**
   - Organize by category: Technical, Workflow, Documentation, Architecture
   - Include both technical and process learnings

5. **Confirm creation:**
   - Display a brief summary showing file path and context used
