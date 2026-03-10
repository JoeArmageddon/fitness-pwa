/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 1800 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /^\/api\/nutrition\/search/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'food-search-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
      },
    },
    {
      urlPattern: /^\/(workout|nutrition|body|recovery|analytics|program|leaderboard)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['*.supabase.co'],
  },
};

module.exports = withPWA(nextConfig);
