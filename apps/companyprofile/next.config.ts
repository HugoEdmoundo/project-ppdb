import type { NextConfig } from "next";

// Origin API digunakan di CSP connect-src. Di produksi isi NEXT_PUBLIC_API_URL
// dengan domain API yang sebenarnya. localhost:8000 hanya safety net untuk dev.
const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "";
const cspConnectSrc = [
  "'self'",
  ...(apiOrigin ? [apiOrigin] : []),
  ...(apiOrigin.includes("localhost") ? [] : ["http://localhost:8000"]),
  "https:",
  "wss://dkynlzmpwndadmbqokry.supabase.co",
].join(" ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "dkynlzmpwndadmbqokry.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src ${cspConnectSrc}; frame-src 'self' https://www.youtube.com; media-src 'self' data: blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'` },
        ],
      },
    ];
  },
};

export default nextConfig;
