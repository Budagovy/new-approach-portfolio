import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* Pin the workspace root. Without this Turbopack walks up and finds the
     lockfile in the home directory. */
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
