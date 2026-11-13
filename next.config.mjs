/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The Weight Lab starts worker threads from files on disk, so make sure
  // those files are copied into the server bundle when deploying (Vercel).
  outputFileTracingIncludes: {
    "/api/matching/weight-lab": ["./workers/**/*", "./lib/matching/scoring.mjs"],
  },
};

export default nextConfig;
