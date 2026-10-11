import { Archivo } from 'next/font/google';

import { SessionSync } from '@/components/auth/session-sync';
import { ThemeSync } from '@/components/theme/theme-sync';
import { Toaster } from '@/components/ui/sonner';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme-script';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

/**
 * Se descarga al compilar y se sirve desde el mismo origen: el navegador no le pide nada a Google.
 * El eje `wdth` habilita el ancho semi-expandido de los títulos.
 */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: {
    default: 'Gestor de Máquinas Virtuales',
    template: '%s · Gestor de VMs',
  },
  description: 'Panel para administrar máquinas virtuales',
};

/**
 * Layout raíz, común a toda página (RF-app-shell-01): documento en español, tipografía, tema sin
 * parpadeo, contenedor de toasts y la sincronización de la sesión entre pestañas (RF-auth-33). El
 * shell del panel vive en `(panel)/layout.tsx`.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT agrega la clase `dark` antes de hidratar. Solo
    // silencia los atributos de <html>, no los de sus hijos.
    <html lang="es" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeSync />
        <SessionSync />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
