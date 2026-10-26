import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // oracle_vm 에서 node server.js 로 띄운다 (deploy/deploy.sh)
  output: "standalone",
};

export default nextConfig;
