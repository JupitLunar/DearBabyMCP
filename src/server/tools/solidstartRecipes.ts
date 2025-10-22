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
    stage: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Stage label such as 'Stage 2' or '2'."),
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
    difficulty: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Desired difficulty level (easy / medium / hard)."),
    max_total_time_minutes: z
      .number({ coerce: true })
      .int()
      .min(1)
      .max(240)
      .optional()
      .describe("Limit the total time (prep + cook) in minutes."),
    max_cook_time_minutes: z
      .number({ coerce: true })
      .int()
      .min(1)
      .max(240)
      .optional()
      .describe("Limit the cooking time in minutes."),
    max_prep_time_minutes: z
      .number({ coerce: true })
      .int()
      .min(1)
      .max(240)
      .optional()
      .describe("Limit the prep time in minutes."),
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

      let ageGroup = input.age_group;
      const normalizedStage =
        !ageGroup && input.stage ? normalizeStageLabel(input.stage) : undefined;
      if (!ageGroup && normalizedStage) {
        ageGroup = normalizedStage;
      }
      if (!ageGroup) {
        ageGroup = deriveAgeGroupFromMonths(input.baby_age_months);
      }

      const language =
        input.lang ?? detectLanguagePreference(rawInput, [input.query, input.meal_type]) ?? "zh";

      const difficultyFilter = normalizeDifficulty(input.difficulty);
      const maxTotalTime = input.max_total_time_minutes;
      const maxCookTime = input.max_cook_time_minutes;
      const maxPrepTime = input.max_prep_time_minutes;

      const params = {
        age_group: ageGroup,
        food_type: input.meal_type,
        search_query: input.query,
    limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
    offset: input.offset,
    lang: language,
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
          lang: language,
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
          lang: language,
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
          lang: language,
        });
        logger.debug(
          { tool: "solidstart.recipes.search", featuredCount: featured.data.length },
          "Falling back to featured recipes",
        );
        candidates = featured.data;
        strategy = "featuredFallback";
      }

      const filters = buildActiveFilters({
        language,
        ageGroup,
        stage: normalizedStage,
        difficulty: difficultyFilter,
        maxTotalTime,
        maxCookTime,
        maxPrepTime,
        allergens: allergensToAvoid,
      });

      const filtered = candidates.filter((recipe) =>
        shouldIncludeRecipe(recipe, allergensToAvoid) &&
        matchesStage(recipe, normalizedStage) &&
        matchesDifficulty(recipe, difficultyFilter) &&
        matchesTime(recipe, {
          maxTotalTime,
          maxCookTime,
          maxPrepTime,
        }),
      );

      const excludedDueToAllergen = candidates.length - filtered.length;

      return {
        content: [],
        structuredContent: {
          params: {
            ...input,
            age_group: ageGroup,
            limit: params.limit,
            lang: language,
          },
          summary: buildSearchSummary({
            total: filtered.length,
            ageGroup,
            mealType: input.meal_type,
            query: input.query,
            excludedDueToAllergen,
            strategy,
            difficulty: difficultyFilter,
            maxTotalTime,
            maxCookTime,
            maxPrepTime,
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
          language,
          filters,
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

      const language =
        input.lang ?? detectLanguagePreference(rawInput, [input.baby_age_months?.toString()]) ?? "zh";

      const params: FeaturedRecipesParams = {
        age_group: ageGroup,
        limit: input.limit ?? 10,
        lang: language,
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
            lang: language,
          },
          recipes: response.data.map(toRecipeSummary),
          language,
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

      const detailLanguage =
        input.lang ??
        (typeof rawInput === "object" && rawInput && "lang" in (rawInput as Record<string, unknown>)
          ? ((rawInput as Record<string, unknown>).lang as string | undefined)
          : undefined);

      const recipe = await client.getRecipeDetails({
        recipeId: input.recipe_id,
        lang: detailLanguage,
      });

      return {
        content: [],
        structuredContent: {
          recipe: toRecipeDetail(recipe),
          nutrition: buildNutrition(recipe),
          tips: buildTips(recipe),
          language: detailLanguage,
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

function detectLanguagePreference(
  rawInput: unknown,
  candidateStrings: Array<string | undefined>,
): "zh" | "en" | undefined {
  const explicitLang =
    typeof rawInput === "object" && rawInput && "lang" in (rawInput as Record<string, unknown>)
      ? (rawInput as Record<string, unknown>).lang
      : undefined;
  if (typeof explicitLang === "string" && explicitLang.trim().length > 0) {
    return normalizeLanguageCode(explicitLang);
  }

  const joined = candidateStrings.filter(Boolean).join(" ");
  if (!joined) {
    return undefined;
  }

  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(joined);
  const hasLatin = /[A-Za-z]/.test(joined);

  if (hasCjk && !hasLatin) {
    return "zh";
  }
  if (hasLatin && !hasCjk) {
    return "en";
  }

  return undefined;
}

function normalizeLanguageCode(code: string): "zh" | "en" | undefined {
  const normalized = code.trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }
  return undefined;
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
  difficulty,
  maxTotalTime,
  maxCookTime,
  maxPrepTime,
}: {
  total: number;
  ageGroup?: Recipe["age_group"];
  mealType?: string;
  query?: string;
  excludedDueToAllergen: number;
  strategy: "exact" | "relaxed" | "ageAgnostic" | "featuredFallback";
  difficulty?: string | null;
  maxTotalTime?: number;
  maxCookTime?: number;
  maxPrepTime?: number;
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

  if (difficulty) {
    parts.push(`(difficulty: ${difficulty})`);
  }

  if (maxTotalTime) {
    parts.push(`(total time ≤ ${maxTotalTime} min)`);
  }

  if (maxCookTime) {
    parts.push(`(cook time ≤ ${maxCookTime} min)`);
  }

  if (maxPrepTime) {
    parts.push(`(prep time ≤ ${maxPrepTime} min)`);
  }

  if (strategy === "relaxed") {
    parts.push("(结果来自放宽筛选)");
  } else if (strategy === "ageAgnostic") {
    parts.push("(ignored age filter for broader results)");
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

function normalizeStageLabel(stage?: string): Recipe["age_group"] | undefined {
  if (!stage) return undefined;
  const trimmed = stage.trim().toUpperCase();
  if (/^STAGE\s*1/.test(trimmed) || /^1\b/.test(trimmed)) return "STAGE_1";
  if (/^STAGE\s*2/.test(trimmed) || /^2\b/.test(trimmed)) return "STAGE_2";
  if (/^STAGE\s*3/.test(trimmed) || /^3\b/.test(trimmed)) return "STAGE_3";
  if (/^STAGE\s*4/.test(trimmed) || /^4\b/.test(trimmed) || /11\+/.test(trimmed))
    return "STAGE_4";
  return undefined;
}

function normalizeDifficulty(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["easy", "medium", "hard"].includes(normalized)) {
    return normalized;
  }
  return normalized;
}

function matchesStage(recipe: Recipe, stage?: Recipe["age_group"]): boolean {
  if (!stage) return true;
  return recipe.age_group === stage;
}

function matchesDifficulty(recipe: Recipe, difficulty?: string): boolean {
  if (!difficulty) return true;
  if (!recipe.difficulty_level) return false;
  return recipe.difficulty_level.toLowerCase() === difficulty;
}

function matchesTime(
  recipe: Recipe,
  options: {
    maxTotalTime?: number;
    maxCookTime?: number;
    maxPrepTime?: number;
  },
): boolean {
  const { maxTotalTime, maxCookTime, maxPrepTime } = options;
  if (!maxTotalTime && !maxCookTime && !maxPrepTime) {
    return true;
  }

  const totalTime = computeTotalTime(recipe);
  if (maxTotalTime && totalTime && totalTime > maxTotalTime) {
    return false;
  }

  if (maxCookTime && recipe.cook_time_minutes && recipe.cook_time_minutes > maxCookTime) {
    return false;
  }

  if (maxPrepTime && recipe.prep_time_minutes && recipe.prep_time_minutes > maxPrepTime) {
    return false;
  }

  return true;
}

function computeTotalTime(
  recipe: Pick<Recipe, "prep_time_minutes" | "cook_time_minutes"> & {
    total_time_minutes?: number | null;
  },
): number | undefined {
  if (typeof recipe.total_time_minutes === "number") {
    return recipe.total_time_minutes;
  }
  const prep = recipe.prep_time_minutes ?? 0;
  const cook = recipe.cook_time_minutes ?? 0;
  const total = prep + cook;
  return total > 0 ? total : undefined;
}

function buildActiveFilters(options: {
  language: string;
  ageGroup?: Recipe["age_group"];
  stage?: Recipe["age_group"];
  difficulty?: string;
  maxTotalTime?: number;
  maxCookTime?: number;
  maxPrepTime?: number;
  allergens: string[];
}) {
  const {
    language,
    ageGroup,
    stage,
    difficulty,
    maxTotalTime,
    maxCookTime,
    maxPrepTime,
  } = options;

  const stageLabel = stage ? AGE_GROUP_METADATA[stage]?.label ?? stage : undefined;
  const difficultyLabel = difficulty
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    : undefined;

  return {
    language,
    age_group: ageGroup,
    stage: stageLabel,
    difficulty: difficultyLabel,
    max_total_time_minutes: maxTotalTime,
    max_cook_time_minutes: maxCookTime,
    max_prep_time_minutes: maxPrepTime,
  };
}

function buildNutrition(recipe: Recipe) {
  return {
    calories_per_serving: recipe.calories_per_serving,
    servings: recipe.servings,
    total_time_minutes: computeTotalTime(recipe) ?? null,
    cook_time_minutes: recipe.cook_time_minutes ?? null,
    prep_time_minutes: recipe.prep_time_minutes ?? null,
    difficulty: recipe.difficulty_level ?? null,
    allergens: recipe.allergens ?? null,
  };
}

function buildTips(recipe: Recipe): string[] {
  const tips: string[] = [];

  if (recipe.safety_notes && typeof recipe.safety_notes === "string") {
    tips.push(recipe.safety_notes);
  }

  if (recipe.source === "manual") {
    tips.push("Recipe curated by Dear Baby nutritionists.");
  }

  if (recipe.difficulty_level && recipe.difficulty_level.toLowerCase() === "easy") {
    tips.push("Great for first-time cooks—minimal prep needed.");
  }

  return tips;
}
