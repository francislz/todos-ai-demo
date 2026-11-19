import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @todos/core ships TypeScript source; let Next compile it.
  transpilePackages: ['@todos/core'],
};

export default nextConfig;
