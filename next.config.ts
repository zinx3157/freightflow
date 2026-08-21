import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Allow the e2b Arena preview proxy to embed the dev server in iframes
  // The wildcard covers any sandbox id preview host (*.e2b.app)
  allowedDevOrigins: [
    "*.e2b.app",
    "localhost:3000",
    "0.0.0.0:3000",
  ],
};

export default nextConfig;
