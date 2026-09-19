/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Page images are served locally from /public/uploads via plain <img>,
  // so no remote image patterns are configured (avoids Image Optimizer exposure).
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-to-img", "@napi-rs/canvas", "sharp"],
  },
};

module.exports = nextConfig;
