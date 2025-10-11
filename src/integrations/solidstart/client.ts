import axios, { AxiosError, AxiosInstance } from "axios";

export type Recipe = {
  id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  age_group: "STAGE_1" | "STAGE_2" | "STAGE_3" | "STAGE_4";
  food_type?: string | null;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty_level: "easy" | "medium" | "hard";
  ingredients: Array<Record<string, unknown>>;
  instructions: string[];
  calories_per_serving?: number | null;
  allergens?: string[] | null;
  safety_notes?: string | null;
  source: "manual" | "ai_generated";
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  likes_count: number;
  dislikes_count?: number | null;
  bookmarks_count: number;
  made_count: number;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type RecipeSearchParams = {
  age_group?: Recipe["age_group"];
  food_type?: string;
  search_query?: string;
  is_featured?: boolean;
  limit?: number;
  offset?: number;
  lang?: string;
};

export type FeaturedRecipesParams = {
  age_group?: Recipe["age_group"];
  limit?: number;
  lang?: string;
};

export type RecipeDetailsParams = {
  recipeId: string;
  lang?: string;
};

type ToggleAction = "like" | "unlike" | "bookmark" | "unbookmark";

export type SolidStartClientOptions = {
  baseURL: string;
  apiKey?: string;
  timeoutMs?: number;
};

export class SolidStartClient {
  private readonly http: AxiosInstance;

  private readonly apiKey?: string;

  constructor(options: SolidStartClientOptions) {
    const { baseURL, apiKey, timeoutMs = 10_000 } = options;

    this.apiKey = apiKey;

    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
    });
  }

  async health(): Promise<boolean> {
    const response = await this.http.get("/health");
    return response.status === 200;
  }

  async listRecipes(
    params: RecipeSearchParams,
  ): Promise<PaginatedResponse<Recipe>> {
    try {
      const response = await this.http.get<PaginatedResponse<Recipe>>(
        "/recipes",
        {
          params: {
            ...params,
            is_featured:
              typeof params.is_featured === "boolean"
                ? params.is_featured
                  ? "true"
                  : "false"
                : undefined,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw this.wrapAxiosError(error);
    }
  }

  async getFeaturedRecipes(
    params: FeaturedRecipesParams,
  ): Promise<PaginatedResponse<Recipe>> {
    try {
      const response = await this.http.get<PaginatedResponse<Recipe>>(
        "/recipes/featured",
        { params },
      );
      return response.data;
    } catch (error) {
      throw this.wrapAxiosError(error);
    }
  }

  async getRecipeDetails({ recipeId, lang }: RecipeDetailsParams): Promise<Recipe> {
    try {
      const response = await this.http.get<Recipe>(`/recipes/${recipeId}`, {
        params: { lang },
      });
      return response.data;
    } catch (error) {
      throw this.wrapAxiosError(error);
    }
  }

  async toggleRecipeInteraction(
    recipeId: string,
    action: ToggleAction,
  ): Promise<void> {
    const headers = this.buildAuthHeaders();
    const endpoint =
      action === "like" || action === "unlike"
        ? `/recipes/${recipeId}/like`
        : `/recipes/${recipeId}/bookmark`;

    try {
      if (action === "like" || action === "bookmark") {
        await this.http.post(endpoint, undefined, { headers });
      } else {
        await this.http.delete(endpoint, { headers });
      }
    } catch (error) {
      throw this.wrapAxiosError(error);
    }
  }

  private buildAuthHeaders():
    | {
        Authorization: string;
      }
    | undefined {
    if (!this.apiKey) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private wrapAxiosError(error: unknown): Error {
    if (error instanceof AxiosError) {
      const message =
        error.response?.data && typeof error.response.data === "object"
          ? JSON.stringify(error.response.data)
          : error.message;
      return new Error(
        `SolidStart API error (${error.response?.status ?? "no-status"}): ${message}`,
      );
    }

    return error instanceof Error
      ? error
      : new Error("Unknown SolidStart API error");
  }
}
