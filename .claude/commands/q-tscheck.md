---
description: Run comprehensive code quality checks
---

# Code Quality Check

**Purpose:** Run comprehensive code quality checks (TypeScript + ESLint + Tailwind) to ensure codebase health. More thorough than q-commit's single TypeScript check.

## When to Use

- Before deploying to production
- After significant changes across multiple files
- Periodically during development to catch issues early
- When debugging mysterious build issues

## Actions

Run the combined check:

```bash
npm run check:all
```

This executes:
1. `npm run typecheck` - TypeScript strict mode validation
2. `npm run lint` - ESLint on .ts, .tsx, .astro files
3. `npm run check:tailwind` - Deprecated Tailwind class detection

## Report Results

Present results in this format:

```
Code Quality Check
──────────────────

TypeScript:  [PASS/FAIL] (error count if failed)
ESLint:      [PASS/FAIL] (X errors, Y warnings)
Tailwind:    [PASS/FAIL] (deprecated classes if found)

Status: [Production Ready / Issues Found]
```

## If Issues Found

1. **TypeScript errors:** Must fix before commit
2. **ESLint errors:** Must fix before commit
3. **ESLint warnings:** Review, fix if straightforward
4. **Tailwind deprecated:** Update to modern equivalents

## Note

`/q-commit` runs TypeScript only. Use `/q-tscheck` for full validation before deployment or when you want comprehensive checks.
