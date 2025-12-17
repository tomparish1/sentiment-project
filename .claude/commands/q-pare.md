---
description: Optimize CLAUDE.md by moving content to OFFLOAD.md
argument-hint: ""
---

# Pare CLAUDE.md

**Purpose:** Optimize CLAUDE.md by moving less-critical reference material to `docs/project/OFFLOAD.md`. Since CLAUDE.md is always loaded into context, keeping it lean improves performance and focuses on essential session guidance.

**Location:** OFFLOAD.md lives at `docs/project/OFFLOAD.md` (not at project root).

---

## Step 1: Dry Run (ALWAYS DO THIS FIRST)

Perform a complete dry run analysis before any changes. This step has three parts:

### 1a. Check Line Count

Check CLAUDE.md line count and report status:
- **Under 150 lines:** Already lean - paring likely not needed
- **150-250 lines:** Review for minor optimizations
- **Over 250 lines:** Good candidate for paring

### 1b. Identify Candidates for Moving

**Criteria for what to KEEP in CLAUDE.md (minimum floor - never remove these):**
- Project overview (1-2 paragraphs)
- Tech stack (list only)
- Core architecture overview (brief)
- Key conventions and coding standards
- Custom slash commands list
- Important constraints and gotchas
- Critical "always do this" rules (e.g., "run tsc before committing")

**Criteria for what to MOVE to docs/project/OFFLOAD.md:**
- Detailed command examples beyond quick reference
- Complete specifications (colors, fonts, schemas)
- Full environment variable descriptions
- Detailed testing/deployment procedures
- Historical context or rationale
- External reference links (except essential project URLs)
- Detailed code examples

### 1c. Present Dry Run Results

Present the analysis in this format:

```
CLAUDE.md Optimization Proposal
──────────────────────────────────

Current State:
   - Lines: [count]
   - Status: [under 150 / 150-250 / over 250]

Potential Sections to Move:
   1. [Section name] (~X lines, lines Y-Z)
      - [What content would move]
      Reason: [Why it matches MOVE criteria]

   2. [Section name] (~X lines, lines Y-Z)
      ...

Sections to Keep:
   - [Section name] - [why it's essential]
   ...

Expected Result:
   - CLAUDE.md: ~[X] lines (down from [Y])
   - Estimated reduction: [X]%

──────────────────────────────────
```

---

## Step 2: Assess Impact (REQUIRED before proceeding)

After the dry run, critically evaluate whether the changes are worthwhile:

### Questions to Answer:

1. **Is the reduction significant?**
   - If reduction is <25%, the convenience loss likely outweighs token savings
   - Small reductions (10-20 lines) are rarely worth the fragmentation

2. **What's lost by moving each section?**
   - Will Claude need to read OFFLOAD.md to understand basic project behavior?
   - Are "detailed" sections actually useful as quick reference?
   - Does the current file already use "See X for details" patterns effectively?

3. **Is CLAUDE.md already well-optimized?**
   - Does it already have OFFLOAD.md pointers?
   - Are sections already concise?

### Provide a Recommendation:

After assessment, state ONE of:

```
RECOMMENDATION: Proceed with paring
- Reduction is significant ([X]%)
- Moved content is truly reference material, not essential guidance
- [Other supporting reasons]

Proceed with these changes? (Y/n)
```

OR

```
RECOMMENDATION: Do not pare
- [Reason 1: e.g., "Reduction <25% (~X lines)"]
- [Reason 2: e.g., "File already well-optimized with OFFLOAD.md pointers"]
- [Reason 3: e.g., "Sections identified as 'moveable' are useful quick reference"]

The file is lean enough. No changes recommended.
```

**Do NOT proceed to Step 3 if recommendation is "Do not pare" unless user explicitly overrides.**

---

## Step 3: Execute Changes (ONLY after user confirms AND recommendation is positive)

After user says yes to a "Proceed with paring" recommendation:

1. **Update docs/project/OFFLOAD.md:**
   - **Preserve existing content** - do not overwrite
   - If OFFLOAD.md exists, append new sections or merge into existing categories
   - If creating new, add header: "# OFFLOAD.md - Extended Documentation"
   - Organize moved content by category (Architecture, Commands, Environment, etc.)

2. **Update CLAUDE.md:**
   - Add/verify pointer to `docs/project/OFFLOAD.md` near top (if not already present)
   - Replace detailed sections with concise summaries + "See docs/project/OFFLOAD.md"
   - Keep structure but reduce verbosity
   - **Minimum floor:** Never reduce below ~100 lines

3. **Verify cross-references:**
   - Check that any "See OFFLOAD.md" pointers use correct path: `docs/project/OFFLOAD.md`
   - Ensure moved content is actually present in OFFLOAD.md

4. **Report completion:**

```
CLAUDE.md Optimized

Moved to docs/project/OFFLOAD.md:
- [List of moved sections]

CLAUDE.md changes:
- Before: ~[X] lines
- After: ~[Y] lines ([Z]% reduction)
- Pointer to docs/project/OFFLOAD.md: [verified/added]

Cross-references verified. Both files ready.
```

---

## Important Rules

- **ALWAYS complete Step 1 (Dry Run) and Step 2 (Assess Impact) before any changes**
- **If reduction <25%, recommend against paring** unless there's a compelling reason
- Wait for explicit user confirmation before executing changes
- If user says no or asks for modifications, adjust the proposal
- **Never reduce CLAUDE.md below ~100 lines** - it must remain useful as standalone guidance
- **Always preserve existing OFFLOAD.md content** when adding new sections
