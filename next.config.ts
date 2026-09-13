import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its AFM font-metrics files off disk relative to its own
  // package directory at runtime; bundling it breaks that path resolution.
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      // Reference file uploads (references.ts) cap the file itself at 20MB;
      // Next's own default Server Action body limit is 1MB and would reject
      // the request before our own size check ever runs. Leave headroom
      // above 20MB for multipart boundary/header overhead.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
