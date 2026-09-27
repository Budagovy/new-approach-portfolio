import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* Pin the workspace root. Without this Turbopack walks up and finds the
     lockfile in the home directory. */
  turbopack: { root: path.resolve(".") },
  /* Weekly Challenge replaced Share the Moment in the same slot, so the
     address that case study was published at still leads somewhere. */
  async redirects() {
    return [
      { source: "/work/simply-share-the-moment", destination: "/work/simply-weekly-challenge", permanent: true },
    ];
  },
};

export default nextConfig;
