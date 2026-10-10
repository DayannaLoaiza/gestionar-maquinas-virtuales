# Icon Conventions — apps/frontend

## Source

ALL icons MUST come from `src/components/svg/` as React SVG components. (Hoy no hay ninguno: el
primero crea la carpeta.)

## Creating New Icons

1. Search existing icons in `src/components/svg/` first — do NOT create duplicates.
2. If the icon does not exist, find it at https://tabler.io/icons.
3. Download the SVG and create a React component following this template:

```tsx
import type { SVGProps } from 'react';

export const IconName = ({
  width = 24,
  height = 24,
  className = '',
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* SVG paths here */}
    </svg>
  );
};
```

## Rules

1. **NEVER** use inline `<svg>` in component files — always import from `@/components/svg/`.
2. **NEVER** install icon libraries (`react-icons`, `lucide-react`, `heroicons`, `@tabler/icons-react`).
3. **NEVER** use `<img>` or `<Image>` for icons.
4. **ALWAYS** use `currentColor` for stroke/fill so the icon inherits text color via `className`.
5. **ALWAYS** accept `SVGProps<SVGSVGElement>` with defaults: `width=24`, `height=24`, `className=''`.
6. **NEVER** add `'use client'` to SVG icon components — they are pure render functions.
7. Un ícono decorativo lleva `aria-hidden`; uno que es el único contenido de un botón necesita
   `aria-label` en el botón.

## File Naming

- **kebab-case** file names: `arrow-left.tsx`, `check-circle.tsx`
- **PascalCase** exported component: `ArrowLeft`, `CheckCircle`

## Usage

```tsx
import { Server } from '@/components/svg/server';

<Server width={18} height={18} className="text-primary-500" />;
```
