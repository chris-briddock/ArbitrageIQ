import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (TDD §2.2: the
  // frontend ships as an independent container).
  // output: "standalone",
  turbopack: {},
};

export default nextConfig;
