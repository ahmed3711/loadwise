/** @type {import('next').NextConfig} */
const nextConfig = {
  // The worker threads load these files from disk at run time, so they
  // must be included when the API routes are uploaded to Vercel
  outputFileTracingIncludes: {
    "/api/matching/stability": ["./workers/**/*", "./lib/matching/stability.mjs"],
    "/api/threads/race": ["./workers/**/*", "./lib/matching/stability.mjs"],
  },
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
