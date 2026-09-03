import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@argus/agents",
    "@argus/consensus",
    "@argus/data-layer",
    "@argus/shared-types",
  ],
};

export default nextConfig;
