import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "../utils/logger";

const CAROUSEL_BUNDLE = "baby-recipes-carousel-v4.js";
const DETAIL_BUNDLE = "baby-recipes-detail-v4.js";
const timestamp = Date.now();
const randomId = Math.random().toString(36).substring(2, 8);
const CAROUSEL_URI = `ui://babyfood/recipes-carousel-v4-${timestamp}.html`;
const DETAIL_URI = `ui://babyfood/recipes-detail-v4-${timestamp}.html`;

function loadBundle(filename: string) {
  const fullPath = resolve(process.cwd(), "dist/components", filename);
  try {
    const code = readFileSync(fullPath, "utf8");
    return code;
  } catch (error) {
    const err = new Error(
      `Failed to load bundle ${filename}. Did you run \"npm run build:components\"?`,
    );
    (err as { cause?: unknown }).cause = error;
    throw err;
  }
}

function buildHtml(bundle: string, options: { title: string }): string {
  const timestamp = Date.now();
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>${options.title}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      button { font: inherit; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      // Cache buster: ${timestamp}
      ${bundle}
    </script>
  </body>
</html>`;
}

export function registerSolidStartResources(
  server: McpServer,
  logger: Logger,
): void {
  const carouselHtml = buildHtml(loadBundle(CAROUSEL_BUNDLE), {
    title: "Solid Start Recipes",
  });

  const detailHtml = buildHtml(loadBundle(DETAIL_BUNDLE), {
    title: "Recipe Detail",
  });

  server.registerResource(
    "dearbaby.recipes.carousel",
    CAROUSEL_URI,
    {
      title: "Solid Start Recipe Carousel",
      _meta: {
        "openai/widgetDescription":
          "Displays a grid of Solid Start recipes with age stage, prep time, and allergen tags.",
        "openai/widgetPrefersBorder": true,
      },
    },
    async () => {
      logger.debug("Serving Solid Start recipe carousel widget");
      return {
        contents: [
          {
            uri: CAROUSEL_URI,
            mimeType: "text/html+skybridge",
            text: carouselHtml,
          },
        ],
      };
    },
  );

  server.registerResource(
    "dearbaby.recipes.detail",
    DETAIL_URI,
    {
      title: "Solid Start Recipe Detail",
      _meta: {
        "openai/widgetDescription":
          "Shows detailed instructions, ingredients, and nutrition info for a Solid Start recipe.",
        "openai/widgetPrefersBorder": false,
      },
    },
    async () => {
      logger.debug("Serving Solid Start recipe detail widget");
      return {
        contents: [
          {
            uri: DETAIL_URI,
            mimeType: "text/html+skybridge",
            text: detailHtml,
          },
        ],
      };
    },
  );
}

export const SOLIDSTART_CAROUSEL_URI = CAROUSEL_URI;
export const SOLIDSTART_DETAIL_URI = DETAIL_URI;
