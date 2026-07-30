/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode is intentionally OFF so the WebGL context isn't
  // double-created in dev. Do not turn it back on.
  reactStrictMode: false,
  // Standalone output traces only the node_modules the server actually
  // needs into .next/standalone — required for the slim Docker runner stage.
  output: 'standalone',
};

module.exports = nextConfig;
