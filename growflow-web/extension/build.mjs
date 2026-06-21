// build.mjs
// ---------
// esbuild script that compiles the extension's TypeScript sources to plain JS in dist/,
// which is what Chrome actually loads (manifest.json and popup.html reference dist/*.js).
//
// Usage:
//   node build.mjs           one-off build
//   node build.mjs --watch   rebuild on change
//
// Why a build step: Chrome MV3 cannot load .ts directly. Bundling each entry point keeps the
// output self-contained (no import resolution needed at runtime).

import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** Shared build options. Each extension entry point becomes one bundled JS file in dist/. */
const options = {
  entryPoints: {
    background: "src/background.ts",
    popup: "src/popup.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "es2022",
  // Source maps make debugging the service worker in DevTools much easier.
  sourcemap: true,
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("esbuild: watching for changes…");
} else {
  await esbuild.build(options);
  console.log("esbuild: build complete -> dist/");
}
