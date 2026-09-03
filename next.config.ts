import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next walks up the tree
  // and picks up stray lockfiles in the home directory (~/pnpm-lock.yaml), then
  // resolves modules against the wrong root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
