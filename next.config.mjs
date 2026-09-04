import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { dev }) => {
    // The dev tuning panel is guarded at runtime, but the bundler still emits
    // dialkit and hoists its stylesheet into the shipped CSS. Swap the module
    // for a stub in production builds so none of it ships.
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.resolve(dir, "src/components/dev/DesignDialsPanel.tsx")]:
          path.resolve(dir, "src/components/dev/DesignDialsPanel.prod.tsx"),
      };
    }
    return config;
  },
};

export default nextConfig;
