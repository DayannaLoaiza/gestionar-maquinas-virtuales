import { PAGE_HEADERS_SOURCE, buildSecurityHeaders } from './src/config/security-headers';

import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ['@vm/shared-types'],
  // Sin `X-Powered-By: Next.js`: no revela la tecnología del servidor (RF-auth-34).
  poweredByHeader: false,
  // El navegador llama siempre a /api/* en este mismo origen; Next lo reenvía al backend NestJS.
  rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
  headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    return [{ source: PAGE_HEADERS_SOURCE, headers: buildSecurityHeaders({ isProduction }) }];
  },
};

export default nextConfig;
