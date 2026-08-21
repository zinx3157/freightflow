import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH=/freightflow when deploying to GitHub Pages
// (project sites live at <user>.github.io/<repo>/). Leave unset for root hosting
// (localhost:3000, Vercel, Netlify, Cloudflare Pages, custom domain, etc.).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath + "/" } : {}),
  // Allow Arena/e2b preview proxy to embed the dev server in iframes
  allowedDevOrigins: [
    "*.e2b.app",
    "localhost:3000",
    "0.0.0.0:3000",
  ],
};

export default nextConfig;
