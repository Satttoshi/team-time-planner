import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow dev access from any device on a private network (dev-only, ignored in production)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
};

export default nextConfig;
