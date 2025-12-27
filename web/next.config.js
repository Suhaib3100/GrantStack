/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
