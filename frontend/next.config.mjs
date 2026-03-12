/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In production (Amplify), NEXT_PUBLIC_API_URL is set - client fetches from that URL directly.
    // Only proxy /api in local dev when env is unset.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/:path*' },
    ];
  },
};

export default nextConfig;
