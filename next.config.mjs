/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server-side file writes to ./exports
  experimental: {
    serverComponentsExternalPackages: ['archiver', 'apify-client', 'canvas', 'fluent-ffmpeg', 'ffmpeg-static'],
  },
};

export default nextConfig;
