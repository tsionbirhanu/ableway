import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static finds its binary next to its own files, so it must not be bundled.
  serverExternalPackages: ["ffmpeg-static"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
