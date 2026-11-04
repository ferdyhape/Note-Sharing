import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Off: this app is almost entirely per-user/dynamic (every real page reads
  // the session), so Cache Components' explicit Suspense/"use cache"
  // boundaries would be needed nearly everywhere for close to no benefit.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
