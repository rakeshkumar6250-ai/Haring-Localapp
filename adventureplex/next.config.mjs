/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  // Configure for production deployment
  output: 'standalone'
};

export default nextConfig;