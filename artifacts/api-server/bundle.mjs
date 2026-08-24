/**
 * Bundles the API server into a single self-contained ESM file at
 * /api/index.mjs, which Vercel deploys as the serverless function.
 * Runs as part of the root `pnpm build` (see vercel.json buildCommand).
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(dir, "src/vercel-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: path.join(dir, "..", "..", "api", "index.mjs"),
  logLevel: "info",
  external: [
    // Optional native ws accelerators — loaded via try/require, safe to omit
    "bufferutil",
    "utf-8-validate",
    // Local-dev-only database; the pglite branch in lib/db never runs on Vercel
    "@electric-sql/pglite",
    "drizzle-orm/pglite",
    // Dev-only pretty logger; the transport branch never runs in production
    "pino-pretty",
  ],
  // CJS deps (express m.fl.) bundled into ESM need a real `require` for
  // node builtins — esbuild's shim throws without this.
  banner: {
    js: `import { createRequire as __bundleCreateRequire } from 'node:module';
const require = __bundleCreateRequire(import.meta.url);`,
  },
});
