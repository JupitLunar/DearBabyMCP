export type RecipeSummary = {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  age_group: "STAGE_1" | "STAGE_2" | "STAGE_3" | "STAGE_4";
  age_group_label?: string;
  months_range?: [number, number];
  food_type?: string | null;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  difficulty_level?: string;
  likes_count?: number;
  bookmarks_count?: number;
  made_count?: number;
  allergens?: string[] | null;
  safety_notes?: string | null;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RecipeDetail = RecipeSummary & {
  ingredients: Array<Record<string, unknown>>;
  instructions: string[];
  calories_per_serving?: number | null;
  source?: string;
  status?: string;
  dislikes_count?: number | null;
  gallery?: string[];
};

export type RecipesToolOutput = {
  summary?: string;
  search_strategy?: string;
  params?: Record<string, unknown>;
  language?: string;
  filters?: {
    language?: string;
    stage?: string;
    age_group?: string;
    difficulty?: string;
    max_total_time_minutes?: number;
    max_cook_time_minutes?: number;
    max_prep_time_minutes?: number;
  };
  pagination?: {
    received: number;
    count: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  excluded_due_to_allergens?: number;
  recipes: RecipeSummary[];
};

export type RecipeDetailToolOutput = {
  recipe: RecipeDetail;
  nutrition?: {
    calories_per_serving?: number | null;
    servings?: number;
    total_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    prep_time_minutes?: number | null;
    difficulty?: string | null;
    allergens?: string[] | null;
  };
  tips?: string[];
  language?: string;
};

export type DisplayMode = "inline" | "fullscreen" | "pip";

export type OpenAiGlobals = {
  displayMode: DisplayMode;
  maxHeight: number;
  theme: "light" | "dark";
  locale: string;
  toolOutput: unknown;
};
