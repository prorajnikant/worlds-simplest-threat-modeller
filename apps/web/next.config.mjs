import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@threat-modeller/core"],
  output: "standalone",
  experimental: {
    // Trace deps from monorepo root so @threat-modeller/core is included
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

export default nextConfig;
