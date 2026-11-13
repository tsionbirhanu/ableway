import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static finds its binary next to its own files, so it must not be bundled.
  serverExternalPackages: ["ffmpeg-static"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // Tailwind CSS v4 (used by the learner-facing pages).
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
