import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the app can run from a slim Docker
  // image (see Dockerfile). Harmless for the Cloudflare/OpenNext build.
  output: "standalone",
  // @libsql/hrana-client imports "@libsql/isomorphic-ws". Next's file tracer
  // only copies that package's `node` export (node.cjs/node.mjs), but OpenNext
  // bundles with esbuild's `workerd` condition, which resolves to web.mjs —
  // missing from the trace. Force-include the whole package so both exist.
  outputFileTracingIncludes: {
    "**": ["./node_modules/@libsql/isomorphic-ws/**"],
  },
};

export default nextConfig;
