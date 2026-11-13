import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@argus/agents",
    "@argus/chain-adapters",
    "@argus/consensus",
    "@argus/data-layer",
    "@argus/shared-types",
  ],
  poweredByHeader: false,
};

export default nextConfig;
