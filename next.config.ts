import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its AFM font-metrics files off disk relative to its own
  // package directory at runtime; bundling it breaks that path resolution.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
