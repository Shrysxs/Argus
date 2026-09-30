import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@argus/agents",
    "@argus/consensus",
    "@argus/data-layer",
    "@argus/shared-types",
  ],
  // Include agent prompt .md files in the serverless function bundle.
  // runner.ts reads these at runtime via fs.readFileSync — without this,
  // Vercel's NFT (nft = Node File Tracer) won't include them and the runner
  // silently falls back to the inline generic prompt instead of the versioned one.
  outputFileTracingIncludes: {
    "/api/analyze": ["../../packages/agents/prompts/**/*.md"],
  },
};

export default nextConfig;
