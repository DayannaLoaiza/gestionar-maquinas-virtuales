# Directives

## React Directives

These are React directives, not Next.js specific.

### `'use client'`

Marks a component as a Client Component. Required for:

- React hooks (`useState`, `useEffect`, etc.)
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)

```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Reference: https://react.dev/reference/rsc/use-client

### `'use server'`

Marks a function as a Server Action. Can be passed to Client Components.

```tsx
'use server';

export async function submitForm(formData: FormData) {
  // Runs on server
}
```

Or inline within a Server Component:

```tsx
export default function Page() {
  async function submit() {
    'use server';
    // Runs on server
  }
  return <form action={submit}>...</form>;
}
```

Reference: https://react.dev/reference/rsc/use-server

---

## Next.js Directive

### `'use cache'`

Marks a function or component for caching. Part of Next.js Cache Components.

```tsx
'use cache';

export async function getCachedData() {
  return await fetchData();
}
```

Requires `cacheComponents: true` in `next.config.ts`.

For detailed usage including cache profiles, `cacheLife()`, `cacheTag()`, and `updateTag()`, see the `next-cache-components` skill.

> **Este proyecto:** está en Next 16, así que `'use cache'` y `cacheComponents` están disponibles,
> pero **no se usan** (`cacheComponents` no está activo y los datos se piden frescos con
> `serverFetch`). La skill `next-cache-components` no está instalada: si se decide adoptarlos,
> instalarla desde `vercel-labs/next-skills` (con `npx skills`, desde Windows) y registrarla en
> `skills-lock.json`.

Reference: https://nextjs.org/docs/app/api-reference/directives/use-cache
