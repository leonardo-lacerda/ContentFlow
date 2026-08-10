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
  productionBrowserSourceMaps: true,
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.devtool = isServer ? 'source-map' : 'hidden-source-map';
    }

    if (isServer) {
      class CopyJsdomCssPlugin {
        apply(compiler) {
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
      { source: '/launches', destination: '/publish', permanent: false },
      { source: '/content-swipe', destination: '/swipe', permanent: false },
      { source: '/ai-generate-images', destination: '/generate', permanent: false },
      { source: '/social-posts/ad-creatives', destination: '/ads', permanent: false },
      { source: '/social-posts/email-campaigns', destination: '/email', permanent: false },
      { source: '/social-posts/video-scripts', destination: '/video', permanent: false },
      { source: '/social-posts', destination: '/posts', permanent: false },
      { source: '/social-posts/:path*', destination: '/posts', permanent: false },
      { source: '/brand', destination: '/brands', permanent: false },
      { source: '/onboarding/company', destination: '/onboarding', permanent: false },
      { source: '/onboarding/brand', destination: '/onboarding', permanent: false },
      { source: '/agents', destination: '/', permanent: false },
      { source: '/agents/:path*', destination: '/', permanent: false },
      { source: '/plugs', destination: '/', permanent: false },
      { source: '/third-party', destination: '/', permanent: false },
      { source: '/template-marketplace', destination: '/', permanent: false },
      { source: '/affiliates', destination: '/', permanent: false },
      { source: '/billing/lifetime', destination: '/billing', permanent: false },
      { source: '/jobs', destination: '/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/inicio',
        destination: '/inicio.html',
      },
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
  sourcemaps: {
    disable: false,
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
  release: {
    create: true,
    finalize: true,
    name:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined,
  },
  widenClientFileUpload: true,
  telemetry: false,
  silent: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  errorHandler: (error) => {
    console.warn('Sentry build error occurred:', error.message);
    console.warn(
      'This might be due to missing Sentry environment variables or network issues'
    );
    return;
  },
});