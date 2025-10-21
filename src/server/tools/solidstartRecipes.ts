import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Logger } from "../utils/logger";
import {
  Recipe,
  SolidStartClient,
  type FeaturedRecipesParams,
} from "../../integrations/solidstart/client";
import {
  SOLIDSTART_CAROUSEL_URI,
  SOLIDSTART_DETAIL_URI,
} from "../resources/solidstartResources";

const AGE_GROUP_METADATA: Record<
  Recipe["age_group"],
  {
    label: string;
    monthsRange: [number, number];
  }
> = {
  STAGE_1: { label: "Stage 1 (around 4-6 months)", monthsRange: [4, 6] },
  STAGE_2: { label: "Stage 2 (around 7-8 months)", monthsRange: [7, 8] },
  STAGE_3: { label: "Stage 3 (around 9-10 months)", monthsRange: [9, 10] },
  STAGE_4: { label: "Stage 4 (11+ months)", monthsRange: [11, 24] },
};

const DEFAULT_SEARCH_LIMIT = 12;
const MAX_SEARCH_LIMIT = 30;

const SearchInputSchema = z
  .object({
    baby_age_months: z
      .number({ coerce: true })
      .int()
      .min(0)
      .max(48)
      .optional()
      .describe("Baby age in months, used to pick an age stage."),
    age_group: z
      .enum(["STAGE_1", "STAGE_2", "STAGE_3", "STAGE_4"])
      .optional()
      .describe("Override age group stage if you already know it."),
    meal_type: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Text label describing meal type, forwarded to food_type filter."),
    allergens_to_avoid: z
      .array(z.string().trim().min(1))
      .max(10)
      .optional()
      .describe("List of allergens to filter out from the results."),
    query: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Free text search query."),
    limit: z
      .number({ coerce: true })
      .int()
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe("Maximum number of recipes to return."),
    offset: z
      .number({ coerce: true })
      .int()
      .min(0)
      .optional()
      .describe("Offset for pagination."),
    lang: z
      .string()
      .trim()
      .min(2)
      .max(5)
      .optional()
      .describe("ISO language code to localize content if supported."),
  })
  .strict();

const FeaturedInputSchema = z
  .object({
    baby_age_months: z
      .number({ coerce: true })
      .int()
      .min(0)
      .max(48)
      .optional(),
    age_group: z
      .enum(["STAGE_1", "STAGE_2", "STAGE_3", "STAGE_4"])
      .optional(),
    limit: z
      .number({ coerce: true })
      .int()
      .min(1)
      .max(20)
      .optional(),
    lang: z.string().trim().min(2).max(5).optional(),
  })
  .strict();

const RecipeDetailsSchema = z
  .object({
    recipe_id: z
      .string()
      .trim()
      .min(1, "recipe_id is required"),
    lang: z.string().trim().min(2).max(5).optional(),
  })
  .strict();

const ToggleBookmarkSchema = z
  .object({
    recipe_id: z.string().trim().min(1),
    bookmarked: z
      .boolean({ coerce: true })
      .default(true)
      .describe("Whether the recipe should be bookmarked (true) or removed (false)."),
  })
  .strict();

const ToggleLikeSchema = z
  .object({
    recipe_id: z.string().trim().min(1),
    liked: z
      .boolean({ coerce: true })
      .default(true)
      .describe("Whether the recipe should be liked (true) or unliked (false)."),
  })
  .strict();

type RegisterOptions = {
  server: McpServer;
  client: SolidStartClient;
  logger: Logger;
};

export function registerSolidStartTools({
  server,
  client,
  logger,
}: RegisterOptions): void {
  server.registerTool(
    "solidstart.recipes.search",
    {
      title: "Search Solid Start Recipes",
      description:
        "Find age-appropriate baby recipes filtered by stage, meal type, and allergens.",
      inputSchema: SearchInputSchema.shape,
      _meta: {
        "openai/toolInvocation/invoking": "Fetching suitable recipes…",
        "openai/toolInvocation/invoked": "Recipe search complete.",
        "openai/outputTemplate": SOLIDSTART_CAROUSEL_URI,
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async (rawInput) => {
      const input = SearchInputSchema.parse(rawInput ?? {});
      const ageGroup =
        input.age_group ?? deriveAgeGroupFromMonths(input.baby_age_months);

      const params = {
        age_group: ageGroup,
        food_type: input.meal_type,
        search_query: input.query,
        limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
        offset: input.offset,
        lang: input.lang,
      };

      logger.debug(
        { tool: "solidstart.recipes.search", params },
        "Calling Solid Start recipe search",
      );

      const allergensToAvoid =
        input.allergens_to_avoid?.map((a) => a.toLowerCase()) ?? [];

      let response = await client.listRecipes(params);
      let candidates = response.data;
      let strategy: "exact" | "relaxed" | "ageAgnostic" | "featuredFallback" = "exact";

      if (!candidates.length && (params.search_query || params.food_type)) {
        const relaxedParams = {
          age_group: params.age_group,
          limit: params.limit,
          lang: params.lang,
        };
        logger.debug(
          {
            tool: "solidstart.recipes.search",
            relaxedParams,
          },
          "No matches found, retrying without query/meal filters",
        );
        response = await client.listRecipes(relaxedParams);
        candidates = response.data;
        strategy = "relaxed";
      }

      if (!candidates.length && params.age_group) {
        const ageAgnosticParams = {
          limit: params.limit,
          lang: params.lang,
        };
        logger.debug(
          {
            tool: "solidstart.recipes.search",
            ageAgnosticParams,
          },
          "Still no matches, retrying without age group",
        );
        response = await client.listRecipes(ageAgnosticParams);
        candidates = response.data;
        strategy = "ageAgnostic";
      }

      if (!candidates.length) {
        const featured = await client.getFeaturedRecipes({
          age_group: strategy === "ageAgnostic" ? undefined : params.age_group,
          limit: params.limit,
          lang: params.lang,
        });
        logger.debug(
          { tool: "solidstart.recipes.search", featuredCount: featured.data.length },
          "Falling back to featured recipes",
        );
        candidates = featured.data;
        strategy = "featuredFallback";
      }

      const filtered = candidates.filter((recipe) =>
        shouldIncludeRecipe(recipe, allergensToAvoid),
      );

      const excludedDueToAllergen = candidates.length - filtered.length;

      return {
        content: [],
        structuredContent: {
          params: {
            ...input,
            age_group: ageGroup,
            limit: params.limit,
          },
          summary: buildSearchSummary({
            total: filtered.length,
            ageGroup,
            mealType: input.meal_type,
            query: input.query,
            excludedDueToAllergen,
            strategy,
          }),
          pagination: {
            received: candidates.length,
            count: response.count,
            page: response.page,
            per_page: response.per_page,
            total_pages: response.total_pages,
          },
          excluded_due_to_allergens: excludedDueToAllergen,
          recipes: filtered.map(toRecipeSummary),
          search_strategy: strategy,
        },
      };
    },
  );

  server.registerTool(
    "solidstart.recipes.featured",
    {
      title: "Featured Solid Start Recipes",
      description:
        "Surface a curated list of featured baby recipes for quick discovery.",
      inputSchema: FeaturedInputSchema.shape,
      _meta: {
        "openai/toolInvocation/invoking": "Loading featured recipes…",
        "openai/toolInvocation/invoked": "Featured recipes ready.",
        "openai/outputTemplate": SOLIDSTART_CAROUSEL_URI,
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async (rawInput) => {
      const input = FeaturedInputSchema.parse(rawInput ?? {});
      const ageGroup =
        input.age_group ?? deriveAgeGroupFromMonths(input.baby_age_months);

      const params: FeaturedRecipesParams = {
        age_group: ageGroup,
        limit: input.limit ?? 10,
        lang: input.lang,
      };

      logger.debug(
        { tool: "solidstart.recipes.featured", params },
        "Fetching featured Solid Start recipes",
      );

      const response = await client.getFeaturedRecipes(params);

      return {
        content: [],
        structuredContent: {
          params: {
            ...input,
            age_group: ageGroup,
            limit: params.limit,
          },
          recipes: response.data.map(toRecipeSummary),
        },
      };
    },
  );

  server.registerTool(
    "solidstart.recipes.getDetails",
    {
      title: "Get Recipe Details",
      description:
        "Retrieve full Solid Start recipe details, including ingredients and instructions.",
      inputSchema: RecipeDetailsSchema.shape,
      _meta: {
        "openai/toolInvocation/invoking": "Opening recipe details…",
        "openai/toolInvocation/invoked": "Recipe details retrieved.",
        "openai/outputTemplate": SOLIDSTART_DETAIL_URI,
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async (rawInput) => {
      const input = RecipeDetailsSchema.parse(rawInput ?? {});

      logger.debug(
        { tool: "solidstart.recipes.getDetails", recipeId: input.recipe_id },
        "Fetching Solid Start recipe details",
      );

      const recipe = await client.getRecipeDetails({
        recipeId: input.recipe_id,
        lang: input.lang,
      });

      return {
        content: [],
        structuredContent: {
          recipe: toRecipeDetail(recipe),
        },
      };
    },
  );

  server.registerTool(
    "solidstart.recipes.toggleBookmark",
    {
      title: "Bookmark Recipe",
      description:
        "Bookmark or remove a bookmark for a Solid Start recipe in the user’s account.",
      inputSchema: ToggleBookmarkSchema.shape,
      _meta: {
        "openai/toolInvocation/invoking": "Updating recipe bookmark…",
        "openai/toolInvocation/invoked": "Recipe bookmark updated.",
      },
    },
    async (rawInput) => {
      const input = ToggleBookmarkSchema.parse(rawInput ?? {});
      const action = input.bookmarked ? "bookmark" : "unbookmark";

      logger.debug(
        {
          tool: "solidstart.recipes.toggleBookmark",
          recipeId: input.recipe_id,
          action,
        },
        "Updating Solid Start bookmark",
      );

      await client.toggleRecipeInteraction(input.recipe_id, action);

      return {
        content: [
          {
            type: "text",
            text: input.bookmarked
              ? "Recipe bookmarked successfully."
              : "Bookmark removed successfully.",
          },
        ],
        structuredContent: {
          recipe_id: input.recipe_id,
          bookmarked: input.bookmarked,
        },
      };
    },
  );

  server.registerTool(
    "solidstart.recipes.toggleLike",
    {
      title: "Like Recipe",
      description: "Like or unlike a Solid Start recipe on behalf of the user.",
      inputSchema: ToggleLikeSchema.shape,
      _meta: {
        "openai/toolInvocation/invoking": "Updating recipe like…",
        "openai/toolInvocation/invoked": "Recipe like updated.",
      },
    },
    async (rawInput) => {
      const input = ToggleLikeSchema.parse(rawInput ?? {});
      const action = input.liked ? "like" : "unlike";

      logger.debug(
        {
          tool: "solidstart.recipes.toggleLike",
          recipeId: input.recipe_id,
          action,
        },
        "Updating Solid Start like",
      );

      await client.toggleRecipeInteraction(input.recipe_id, action);

      return {
        content: [
          {
            type: "text",
            text: input.liked
              ? "Recipe liked successfully."
              : "Removed your like from the recipe.",
          },
        ],
        structuredContent: {
          recipe_id: input.recipe_id,
          liked: input.liked,
        },
      };
    },
  );
}

function deriveAgeGroupFromMonths(
  months?: number,
): Recipe["age_group"] | undefined {
  if (typeof months !== "number") {
    return undefined;
  }

  if (months <= 6) return "STAGE_1";
  if (months <= 8) return "STAGE_2";
  if (months <= 10) return "STAGE_3";
  return "STAGE_4";
}

function shouldIncludeRecipe(recipe: Recipe, allergens: string[]): boolean {
  if (allergens.length === 0) {
    return true;
  }

  if (!recipe.allergens || recipe.allergens.length === 0) {
    return true;
  }

  const recipeAllergens = recipe.allergens
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  return !allergens.some((allergen) => recipeAllergens.includes(allergen));
}

function buildSearchSummary({
  total,
  ageGroup,
  mealType,
  query,
  excludedDueToAllergen,
  strategy,
}: {
  total: number;
  ageGroup?: Recipe["age_group"];
  mealType?: string;
  query?: string;
  excludedDueToAllergen: number;
  strategy: "exact" | "relaxed" | "ageAgnostic" | "featuredFallback";
}): string {
  const parts: string[] = [];

  parts.push(`Found ${total} recipe${total === 1 ? "" : "s"}`);

  if (ageGroup && AGE_GROUP_METADATA[ageGroup]) {
    parts.push(`for ${AGE_GROUP_METADATA[ageGroup].label}`);
  }

  if (mealType) {
    parts.push(`(meal type: ${mealType})`);
  }

  if (query) {
    parts.push(`matching “${query}”`);
  }

  if (excludedDueToAllergen > 0) {
    parts.push(
      `(${excludedDueToAllergen} filtered out because of allergen restrictions)`,
    );
  }

  if (strategy === "relaxed") {
    parts.push("(结果来自放宽筛选)");
  } else if (strategy === "featuredFallback") {
    parts.push("(展示推荐食谱)");
  }

  return parts.join(" ").trim();
}

function toRecipeSummary(recipe: Recipe) {
  const stageMetadata = AGE_GROUP_METADATA[recipe.age_group];
  return {
    id: recipe.id,
    name: recipe.name,
    display_name: recipe.display_name ?? recipe.name,
    description: recipe.description,
    image_url: recipe.image_url,
    thumbnail_url: recipe.thumbnail_url,
    age_group: recipe.age_group,
    age_group_label: stageMetadata?.label,
    months_range: stageMetadata?.monthsRange,
    food_type: recipe.food_type,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    total_time_minutes:
      recipe.prep_time_minutes + recipe.cook_time_minutes || undefined,
    servings: recipe.servings,
    difficulty_level: recipe.difficulty_level,
    likes_count: recipe.likes_count,
    bookmarks_count: recipe.bookmarks_count,
    made_count: recipe.made_count,
    allergens: recipe.allergens,
    safety_notes: recipe.safety_notes,
    is_featured: recipe.is_featured,
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  };
}

function toRecipeDetail(recipe: Recipe) {
  return {
    ...toRecipeSummary(recipe),
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    calories_per_serving: recipe.calories_per_serving,
    source: recipe.source,
    status: recipe.status,
    dislikes_count: recipe.dislikes_count,
  };
}
