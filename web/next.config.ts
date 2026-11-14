import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // ffmpeg-static finds its binary next to its own files, so it must not be bundled.
  serverExternalPackages: ["ffmpeg-static"],
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework.
  poweredByHeader: false,
  // No source maps in the browser bundle: they would expose server-adjacent code paths.
  productionBrowserSourceMaps: false,
  async headers() {
    return securityHeaders(process.env.NODE_ENV !== "production");
  },
};

export default nextConfig;
