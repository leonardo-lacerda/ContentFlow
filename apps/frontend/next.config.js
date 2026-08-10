// @ts-check
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';
import fs from 'fs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    proxyTimeout: 90_000,
  },
  // Document-Policy header for browser profiling
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
        ],
      },
    ];
  },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  // Enable production sourcemaps for Sentry
  productionBrowserSourceMaps: true,

  // Custom webpack config: sourcemaps + jsdom CSS stub for SSR
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.devtool = isServer ? 'source-map' : 'hidden-source-map';
    }

    if (isServer) {
      class CopyJsdomCssPlugin {
        apply(/** @type {any} */ compiler) {
          compiler.hooks.afterEmit.tap('CopyJsdomCssPlugin', () => {
            const candidates = [
              path.join(process.cwd(), 'node_modules/isomorphic-dompurify/node_modules/jsdom/lib/browser/default-stylesheet.css'),
              path.join(process.cwd(), '../../node_modules/isomorphic-dompurify/node_modules/jsdom/lib/browser/default-stylesheet.css'),
              path.join(process.cwd(), 'node_modules/jsdom/lib/browser/default-stylesheet.css'),
              path.join(process.cwd(), '../../node_modules/jsdom/lib/browser/default-stylesheet.css'),
            ];
            const src = candidates.find((c) => fs.existsSync(c));
            const content = src
              ? fs.readFileSync(src)
              : Buffer.from('/* jsdom default stylesheet stub */\n');
            const outRoot = path.join(process.cwd(), '.next/server');
            const targets = [
              path.join(outRoot, 'app/(app)/browser/default-stylesheet.css'),
              path.join(outRoot, 'browser/default-stylesheet.css'),
              path.join(outRoot, 'chunks/browser/default-stylesheet.css'),
            ];
            for (const dest of targets) {
              try {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.writeFileSync(dest, content);
              } catch (_) {}
            }
          });
        }
      }
      config.plugins = config.plugins || [];
      config.plugins.push(new CopyJsdomCssPlugin());
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: '/api/uploads/:path*',
        destination:
          process.env.STORAGE_PROVIDER === 'local' ? '/uploads/:path*' : '/404',
        permanent: true,
      },
      // ContentFlow v1 — rotas canônicas
      { source: '/launches', destination: '/publish', permanent: false },
      { source: '/content-swipe', destination: '/swipe', permanent: false },
      {
        source: '/ai-generate-images',
        destination: '/generate',
        permanent: false,
      },
      // Ampliar — deep links legados
      {
        source: '/social-posts/ad-creatives',
        destination: '/ads',
        permanent: false,
      },
      {
        source: '/social-posts/email-campaigns',
        destination: '/email',
        permanent: false,
      },
      {
        source: '/social-posts/video-scripts',
        destination: '/video',
        permanent: false,
      },
      { source: '/social-posts', destination: '/posts', permanent: false },
      {
        source: '/social-posts/:path*',
        destination: '/posts',
        permanent: false,
      },
      // Multi-marca reativado: /brand é atalho para lista
      { source: '/brand', destination: '/brands', permanent: false },
      {
        source: '/onboarding/company',
        destination: '/onboarding',
        permanent: false,
      },
      {
        source: '/onboarding/brand',
        destination: '/onboarding',
        permanent: false,
      },
      // Features ainda fora do core → Estúdio
      { source: '/agents', destination: '/', permanent: false },
      { source: '/agents/:path*', destination: '/', permanent: false },
      { source: '/plugs', destination: '/', permanent: false },
      { source: '/third-party', destination: '/', permanent: false },
      {
        source: '/template-marketplace',
        destination: '/',
        permanent: false,
      },
      { source: '/affiliates', destination: '/', permanent: false },
      {
        source: '/billing/lifetime',
        destination: '/billing',
        permanent: false,
      },
      { source: '/jobs', destination: '/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination:
          process.env.STORAGE_PROVIDER === 'local'
            ? '/api/uploads/:path*'
            : '/404',
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sourcemap configuration optimized for monorepo
  sourcemaps: {
    disable: false,
    // More comprehensive asset patterns for monorepo
    assets: [
      '.next/static/**/*.js',
      '.next/static/**/*.js.map',
      '.next/server/**/*.js',
      '.next/server/**/*.js.map',
    ],
    ignore: [
      '**/node_modules/**',
      '**/*hot-update*',
      '**/_buildManifest.js',
      '**/_ssgManifest.js',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    deleteSourcemapsAfterUpload: true,
  },

  // Release configuration
  release: {
    create: true,
    finalize: true,
    // Use git commit hash for releases in monorepo
    name:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined,
  },

  // NextJS specific optimizations for monorepo
  widenClientFileUpload: true,

  // Additional configuration
  telemetry: false,
  silent: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',

  // Error handling for CI/CD
  errorHandler: (error) => {
    console.warn('Sentry build error occurred:', error.message);
    console.warn(
      'This might be due to missing Sentry environment variables or network issues'
    );
    // Don't fail the build if Sentry upload fails in monorepo context
    return;
  },
});
