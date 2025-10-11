import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "../utils/logger";

const CAROUSEL_BUNDLE = "solidstart-recipes-carousel.js";
const DETAIL_BUNDLE = "solidstart-recipes-detail.js";

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
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    "solidstart.recipes.carousel",
    "ui://solidstart/recipes-carousel.html",
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
            uri: "ui://solidstart/recipes-carousel.html",
            mimeType: "text/html+skybridge",
            text: carouselHtml,
          },
        ],
      };
    },
  );

  server.registerResource(
    "solidstart.recipes.detail",
    "ui://solidstart/recipe-detail.html",
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
            uri: "ui://solidstart/recipe-detail.html",
            mimeType: "text/html+skybridge",
            text: detailHtml,
          },
        ],
      };
    },
  );
}
