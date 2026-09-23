/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Page images are served locally from /public/uploads via plain <img>,
  // so no remote image patterns are configured (avoids Image Optimizer exposure).
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-to-img",
      "@napi-rs/canvas",
      "sharp",
      "@aws-sdk/client-s3",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
