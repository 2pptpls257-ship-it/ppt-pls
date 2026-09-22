import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm, mkdir, copyFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // 1. Standalone ESM server
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    sourcemap: "linked",
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  // 2. Standalone CJS Serverless Function for Vercel
  const localApiDir = path.resolve(artifactDir, "api");
  const rootApiDir = path.resolve(rootDir, "api");
  await mkdir(localApiDir, { recursive: true });
  await mkdir(rootApiDir, { recursive: true });

  const serverlessFile = path.resolve(localApiDir, "index.js");
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/app.ts")],
    platform: "node",
    target: "node18",
    bundle: true,
    format: "esm",
    outfile: serverlessFile,
    logLevel: "info",
  });

  // Copy to [...slug].js and root api/ directory for maximum compatibility
  await copyFile(serverlessFile, path.resolve(localApiDir, "[...slug].js"));
  await copyFile(serverlessFile, path.resolve(rootApiDir, "index.js"));
  await copyFile(serverlessFile, path.resolve(rootApiDir, "[...slug].js"));

  for (const name of ["catalog.js", "orders.js", "checkout.js"]) {
    try {
      await copyFile(path.resolve(rootApiDir, name), path.resolve(localApiDir, name));
    } catch {
      // ignore
    }
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
