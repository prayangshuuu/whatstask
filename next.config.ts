import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Exclude whatsapp-web.js from bundling - it's a Node.js-only package
  // that uses dynamic requires and browser-specific modules that don't work with Next.js bundler
  serverExternalPackages: ["whatsapp-web.js"],
};

export default nextConfig;
