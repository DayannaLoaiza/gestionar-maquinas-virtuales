---
name: optimize-bundle
description: 'Analyze and optimize the Next.js bundle size of apps/frontend. Identifies large dependencies, suggests code splitting, and recommends lazy loading'
model: haiku
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Bundle Size Analysis and Optimization

Analyze the Next.js bundle and provide actionable optimization recommendations.

## Step 1: Build and Capture Output

```bash
pnpm --filter @vm/frontend build 2>&1
```

Next 16 builds with Turbopack and its route table no longer prints First Load JS sizes. For sizes
use the built-in analyzer (Next.js 16.1+, see the `next-best-practices` skill → `bundling.md`) or
inspect `.next/static/chunks`. Identify:

- Per-route client JS
- Shared chunks size
- Routes with large client bundles (> 100KB WARNING, > 200KB CRITICAL)

## Step 2: Check Dynamic Imports

Search `apps/frontend/src/` for heavy libraries that should load with `next/dynamic`:

- Chart libraries, rich text editors, PDF viewers, 3D viewers
- Any component only used on specific routes or after an interaction

## Step 3: Check for Unnecessary Client Components

```
Grep: "use client" in apps/frontend/src/
```

Components that only render static content with no hooks, event handlers, or browser APIs should
be Server Components. Keep `'use client'` at the leaves (e.g. a feature's table wrapper owns the
TanStack columns because they contain functions).

## Step 4: Analyze Duplicate Dependencies

```bash
pnpm --filter @vm/frontend ls --depth 0 2>/dev/null
```

Look for the same dependency at different versions across `apps/frontend`, `apps/backend` and
`packages/*` (e.g. `zod`), and peer dependency mismatches.

## Step 5: Tree-Shaking Opportunities

```
Grep: import * as    (namespace imports prevent tree-shaking)
Grep: require(       (CommonJS imports prevent tree-shaking)
```

Recommend converting to named imports where possible.

## Step 6: Image and Asset Optimization

- Unoptimized images not using `next/image`
- Large static assets in `public/`
- Inline SVGs that should be components in `src/components/svg/`

## Output Report

```
============================================
  BUNDLE ANALYSIS REPORT - apps/frontend
  Build Date: $(date -u +"%Y-%m-%d %H:%M UTC")
============================================

ROUTE SIZES:
  /path/to/route    XXX KB  [OK|WARNING|CRITICAL]

OPTIMIZATION OPPORTUNITIES:
  1. [IMPACT: HIGH] Description - File: path/to/file.tsx

ESTIMATED SAVINGS: ~XX KB total
============================================
```
