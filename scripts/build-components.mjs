import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "../dist/components");

async function main() {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  await build({
    entryPoints: {
      "baby-recipes-carousel-v4": resolve(
        __dirname,
        "../src/components/widgets/recipeCarouselNew.tsx",
      ),
      "baby-recipes-detail-v4": resolve(
        __dirname,
        "../src/components/widgets/recipeDetailNew.tsx",
      ),
    },
    bundle: true,
    platform: "browser",
    target: "es2021",
    format: "esm",
    outdir,
    sourcemap: process.env.NODE_ENV !== "production",
    minify: process.env.NODE_ENV === "production",
    loader: {
      ".ts": "ts",
      ".tsx": "tsx",
    },
  });
}

main().catch((error) => {
  console.error("Failed to build Skybridge components", error);
  process.exit(1);
});
