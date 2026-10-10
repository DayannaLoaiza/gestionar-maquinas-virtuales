---
name: generate-component
description: 'Generate a React component for apps/frontend following its conventions (Tailwind 4 tokens, CVA, Radix wrappers, icons as components)'
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs
argument-hint: '<component-name> [--type ui|feature|page] [--feature <name>]'
---

<!--
Por qué este frontmatter:
- disable-model-invocation: crea archivos; la lanza la usuaria con /generate-component.
- Sin `model:`: usa el modelo de la sesión.
- Mandan apps/frontend/CLAUDE.md y apps/frontend/.claude/rules/; si algo de acá no coincide, ganan
  ellas.
-->

# Generate React Component

The authority is `apps/frontend/CLAUDE.md` and `apps/frontend/.claude/rules/`.

## Step 0: SDD

Un componente que cambia lo que ve el usuario es parte de un cambio M o L (`docs/sdd/README.md`):
sin `tasks.md` aprobado no se edita `apps/`.

## Step 1: MANDATORY — Audit Existing Components

```
Glob: apps/frontend/src/components/**/*.tsx
Glob: apps/frontend/src/features/**/components/*.tsx
```

If a similar component already exists, STOP and suggest extending it instead of creating a
duplicate.

## Step 2: Read the conventions

- `apps/frontend/CLAUDE.md` with **Read** (also loads the frontend rules).
- `apps/frontend/src/app/globals.css` — the tokens (`@theme`). Only use tokens that exist there;
  never a literal hex.
- Spacing: 8px grid. Transitions: `duration-200`.
- If the component needs Radix, CVA, sonner or react-hook-form and they are **not installed yet**,
  stop and say so: installing them is a dependency change the user runs from Windows.

## Step 3: Parse Arguments

From `$ARGUMENTS`:

- **component-name** — file name in **kebab-case** (`status-badge.tsx`), exported component in
  PascalCase (`StatusBadge`).
- **--type** (default `ui`):
  - `ui` → `apps/frontend/src/components/ui/<component-name>.tsx` — reusable primitive
  - `feature` → `apps/frontend/src/features/<feature>/components/<component-name>.tsx`
  - `page` → `apps/frontend/src/app/<route>/page.tsx` — ask for the route if it's not obvious

## Step 4: Consult Context7 When Needed

If the component wraps a Radix primitive (only inside `components/ui/`), resolve
`radix-ui/primitives` and query its accessibility API. Same for TanStack Table v8 features.

## Step 5: Generate

### `ui` — primitive

With real variants, use CVA; with one or two states, `cn()` with conditionals:

```tsx
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import type { VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-zinc-200 text-zinc-700',
        success: 'bg-emerald-100 text-emerald-800',
        error: 'bg-red-100 text-red-800',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type StatusBadgeProps = React.ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>;

function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />;
}

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
```

React 19 passes `ref` as a regular prop: no `forwardRef`.

### `feature` — client component with data

- `'use client'` only if it uses hooks, events, or browser APIs.
- Requests: `get/post/put/patch/del` from `@/lib/api/fetch-wrapper` — **never** bare `fetch` with
  manual `response.ok`.
- Errors: `toUserMessage(error, '<fallback>')` (or `notify.apiError` once sonner exists). The
  fallback is the text the user sees on 5xx/429 — write it as final copy.
- Forms: `.claude/rules/forms-conventions.md` (react-hook-form + `zodResolver`, schema from
  `@vm/shared-types`).
- TanStack Table columns: module-level `const` or `useMemo(() => [...], [])` with **empty** deps.

### `page` — Server Component

```tsx
import { Suspense } from 'react';

import { serverFetchResult, dataOrNotFound } from '@/lib/api/server-fetch';

import type { ThingsResponse } from '@/types/api';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Things' };

async function ThingsList() {
  const { things } = dataOrNotFound(
    await serverFetchResult<ThingsResponse>('/api/things?pageSize=100'),
    'No se pudieron cargar los datos',
  );
  return <ThingsTable data={things} />;
}

export default function ThingsPage() {
  return (
    <Suspense fallback={<ThingsSkeleton />}>
      <ThingsList />
    </Suspense>
  );
}
```

- Data **always** through `serverFetch` / `serverFetchResult`. No Server Actions.
- Response types go in `src/types/api.ts`.
- A route that can fail gets its `error.tsx` (Client Component with a retry button).

## Step 6: Supporting Files

- New icon → `apps/frontend/src/components/svg/`, following `.claude/rules/icon-conventions.md`
  (Tabler, `currentColor`, no `'use client'`). Never inline `<svg>`.

## Step 7: Verify

- No `any`; props type exported.
- `cn` imported from `@/lib/utils`.
- Only tokens that exist; no hex.
- Icon-only buttons have `aria-label`; keyboard navigation works.
- `pnpm --filter @vm/frontend lint` and `pnpm --filter @vm/frontend typecheck` pass. Tests only if
  the requirement is Critical (`docs/testing.md`); Vitest runs through Windows Node from WSL.
