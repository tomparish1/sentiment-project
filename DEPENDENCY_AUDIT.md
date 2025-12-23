# Dependency Audit Report

**Date:** 2025-12-23
**Project:** sentiment-analyzer v0.4.0

## Executive Summary

This audit identified **6 security vulnerabilities**, **7 significantly outdated packages**, and **1 potential bloat issue**. Immediate action is recommended for security fixes and major version updates.

---

## 1. Security Vulnerabilities

### Critical/High Priority

| Severity | Package | Issue | Fix |
|----------|---------|-------|-----|
| Moderate | esbuild ≤0.24.2 | Development server can leak responses to any website ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)) | Update vite to v7.x |
| Moderate | vite 0.11.0-6.1.6 | Depends on vulnerable esbuild | Update to vite@7.3.0+ |
| Moderate | vitest (transitive) | Depends on vulnerable vite | Update to vitest@3.x+ |

**Action:** Run `npm audit fix --force` (breaking changes) or update vite/vitest manually.

### Supply Chain Alert

⚠️ **CISA Alert (Sep 2025):** Verify packages against the "Shai-Hulud" npm supply chain incident. Run:
```bash
npx snyk test
```

---

## 2. Outdated Packages

### Major Version Updates (Breaking Changes Expected)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| **@anthropic-ai/sdk** | ^0.32.1 | 0.71.2 | **Significantly outdated** - 40+ versions behind. May have breaking API changes. |
| **express** | ^4.18.2 | 5.2.1 | Express 5 is now stable (default on npm since March 2025). Better async error handling, improved security. |
| **dotenv** | ^16.3.1 | 17.2.3 | Major version bump |
| **pdf-parse** | ^1.1.1 | 2.4.5 | Major update available |
| **pino** | ^9.0.0 | 10.1.0 | Major version bump |
| **zod** | ^3.23.0 | 4.2.1 | Zod 4 released with performance improvements |

### Minor/Patch Updates

| Package | Current | Latest |
|---------|---------|--------|
| dotenv | ^16.3.1 | 16.6.1 (within semver) |
| swagger-ui-express | ^5.0.0 | 5.0.1 |

---

## 3. Bloat Analysis

### Heavy Dependencies

| Package | Size Impact | Usage | Recommendation |
|---------|-------------|-------|----------------|
| **@xenova/transformers** | ~50MB+ (with models) | Used in `embedding-engine` skill only | ✅ Already lazy-loaded via dynamic import. Consider moving to optional dependency. |

### Dependency Usage Verification

| Package | Files Using | Status |
|---------|-------------|--------|
| @anthropic-ai/sdk | 5 files | ✅ Actively used |
| @xenova/transformers | 1 file (lazy) | ⚠️ Large but properly lazy-loaded |
| dotenv | 3 files | ✅ Actively used |
| express | 12 files | ✅ Core dependency |
| mammoth | 2 files | ✅ Used for DOCX parsing |
| multer | 3 files | ✅ Used for file uploads |
| pdf-parse | 2 files | ✅ Used for PDF parsing |
| pino | 1 file (logger) | ✅ Actively used |
| swagger-jsdoc | 2 files | ✅ API documentation |
| swagger-ui-express | 2 files | ✅ API documentation |
| zod | 15 files | ✅ Core validation library |

**Conclusion:** No unused dependencies detected. All packages are actively used.

---

## 4. Recommendations

### Immediate Actions (Security)

```bash
# Fix security vulnerabilities (may have breaking changes)
npm audit fix --force

# Or manually update vite ecosystem
npm install vite@^7.0.0 vitest@^3.0.0 @vitest/coverage-v8@^3.0.0
```

### High Priority Updates

```bash
# Update Anthropic SDK (test thoroughly - breaking changes likely)
npm install @anthropic-ai/sdk@latest

# Update to Express 5 (requires migration)
npm install express@^5.0.0
# Review: https://expressjs.com/en/guide/migrating-5.html
```

### Recommended package.json Changes

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@xenova/transformers": "^2.17.2",
    "dotenv": "^16.6.1",
    "express": "^5.2.1",
    "mammoth": "^1.11.0",
    "multer": "^2.0.2",
    "pdf-parse": "^2.4.5",
    "pino": "^9.14.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "vite": "^7.3.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### Optional Optimization

Consider making `@xenova/transformers` an optional peer dependency:

```json
{
  "optionalDependencies": {
    "@xenova/transformers": "^2.17.2"
  }
}
```

This allows the embedding-engine skill to work when installed but doesn't bloat installations that don't need it.

### Consider Replacing @xenova/transformers

The `@xenova/transformers` package hasn't been updated in 2 years. Consider migrating to the official `@huggingface/transformers` package which has WebGPU support and is actively maintained.

---

## 5. Migration Checklist

- [ ] Run `npm audit fix` to address security vulnerabilities
- [ ] Update `@anthropic-ai/sdk` and test API compatibility
- [ ] Migrate to Express 5 (review migration guide)
- [ ] Update `pdf-parse` to v2.x
- [ ] Update `zod` to v3.25+ (or evaluate v4 migration)
- [ ] Update `vite` and `vitest` to latest major versions
- [ ] Run full test suite after updates
- [ ] Consider `@huggingface/transformers` migration for WebGPU support

---

## Sources

- [npm @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Express 5.1.0 Release](https://expressjs.com/2025/03/31/v5-1-latest-release.html)
- [pdf-parse Snyk](https://security.snyk.io/package/npm/pdf-parse)
- [CISA npm Supply Chain Alert](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)
- [Bundlephobia - @xenova/transformers](https://bundlephobia.com/package/@xenova/transformers)
- [GitHub Advisory GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
