import { createRoot } from "react-dom/client";
import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { useToolOutput } from "./useOpenAiGlobals";
import "./openaiBridge";
import type {
  RecipeDetail,
  RecipeDetailToolOutput,
  RecipeSummary,
  RecipesToolOutput,
  DisplayMode,
} from "./types";

const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#0ea5e9";
const ACCENT_SOFT = "#f0f9ff";

const RecipeCarouselV4: React.FC = () => {
  const toolOutput = useToolOutput<RecipesToolOutput>({ recipes: [] });
  const recipes = useMemo(() => toolOutput.recipes ?? [], [toolOutput.recipes]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [detailNutrition, setDetailNutrition] = useState<RecipeDetailToolOutput["nutrition"]>();
  const [detailTips, setDetailTips] = useState<string[] | undefined>();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const detailTitleId = useId();
  const detailDescriptionId = useId();

  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isCompact = viewportWidth < 960;

  const activeLanguage = useMemo(() => {
    const direct =
      (toolOutput as { language?: unknown }).language &&
      typeof (toolOutput as { language?: unknown }).language === "string"
        ? ((toolOutput as { language?: unknown }).language as string)
        : undefined;

    if (direct) {
      return direct;
    }

    if (toolOutput.params && typeof toolOutput.params === "object") {
      const lang = (toolOutput.params as Record<string, unknown>).lang;
      if (typeof lang === "string") {
        return lang;
      }
    }

    return undefined;
  }, [toolOutput]);

  const isEnglish = activeLanguage?.toLowerCase().startsWith("en") ?? false;

  const filters = toolOutput.filters ?? {};

  const filterChips = useMemo(() => {
    const chips: string[] = [];

    const stage = typeof filters.stage === "string" ? filters.stage : undefined;
    if (stage) {
      chips.push(isEnglish ? `Stage: ${stage}` : `阶段：${stage}`);
    }

    const difficulty = typeof filters.difficulty === "string" ? filters.difficulty : undefined;
    if (difficulty) {
      chips.push(
        isEnglish ? `Difficulty: ${difficulty}` : `难度：${difficulty === "Easy" ? "简单" : difficulty}`,
      );
    }

    const totalTime = filters.max_total_time_minutes as number | undefined;
    if (typeof totalTime === "number") {
      chips.push(isEnglish ? `Total ≤ ${totalTime} min` : `总时长 ≤ ${totalTime} 分钟`);
    }

    const cookTime = filters.max_cook_time_minutes as number | undefined;
    if (typeof cookTime === "number") {
      chips.push(isEnglish ? `Cook ≤ ${cookTime} min` : `烹饪 ≤ ${cookTime} 分钟`);
    }

    const prepTime = filters.max_prep_time_minutes as number | undefined;
    if (typeof prepTime === "number") {
      chips.push(isEnglish ? `Prep ≤ ${prepTime} min` : `准备 ≤ ${prepTime} 分钟`);
    }

    return chips;
  }, [filters, isEnglish]);

  const detailContentLayoutStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isCompact ? "column" : "row",
    gap: isCompact ? "20px" : "28px",
    alignItems: "stretch",
  };

  const detailMediaColumnStyle: React.CSSProperties = {
    flex: isCompact ? "0 0 auto" : "0 0 48%",
    width: isCompact ? "100%" : "48%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const detailInfoColumnStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };

  const formatMinutes = (value: number) =>
    `${value} ${isEnglish ? "min" : "分钟"}`;
  const formatServings = (value: number) =>
    `${value} ${isEnglish ? "servings" : "份"}`;
  const formatDifficultyLabel = (value?: string | null) => {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    if (isEnglish) return capitalized;
    if (normalized === "easy") return "简单";
    if (normalized === "medium") return "中等";
    if (normalized === "hard") return "困难";
    return value;
  };

  const computeRecipeTotalTime = (recipe: RecipeSummary): number | undefined => {
    if (recipe.total_time_minutes) return recipe.total_time_minutes;
    const prep = recipe.prep_time_minutes ?? 0;
    const cook = recipe.cook_time_minutes ?? 0;
    const total = prep + cook;
    return total > 0 ? total : undefined;
  };

  const buildRecipeMeta = (recipe: RecipeSummary) => {
    const chips: Array<{ icon: string; text: string }> = [];
    const totalTime = computeRecipeTotalTime(recipe);
    if (typeof totalTime === "number") {
      chips.push({ icon: "⏱", text: formatMinutes(totalTime) });
    }
    if (typeof recipe.servings === "number") {
      chips.push({ icon: "🍽", text: formatServings(recipe.servings) });
    }
    const difficultyLabel = formatDifficultyLabel(recipe.difficulty_level ?? null);
    if (difficultyLabel) {
      chips.push({ icon: "⭐", text: difficultyLabel });
    }
    return chips;
  };

  const sectionTitle = (key: "ingredients" | "instructions" | "nutrition" | "tips") => {
    if (isEnglish) {
      switch (key) {
        case "ingredients":
          return "Ingredients";
        case "instructions":
          return "Instructions";
        case "nutrition":
          return "Nutrition";
        case "tips":
          return "Tips";
        default:
          return key;
      }
    }

    switch (key) {
      case "ingredients":
        return "食材";
      case "instructions":
        return "步骤";
      case "nutrition":
        return "营养";
      case "tips":
        return "小贴士";
      default:
        return key;
    }
  };

  const nutritionItems = useMemo(() => {
    if (!detailNutrition) return [] as Array<{ label: string; value: string }>;
    const items: Array<{ label: string; value: string }> = [];

    if (detailNutrition.calories_per_serving != null) {
      items.push({
        label: isEnglish ? "Calories" : "热量",
        value: `${detailNutrition.calories_per_serving} ${isEnglish ? "kcal" : "千卡"}`,
      });
    }

    if (typeof detailNutrition.servings === "number") {
      items.push({
        label: isEnglish ? "Servings" : "份量",
        value: `${detailNutrition.servings}`,
      });
    }

    if (detailNutrition.total_time_minutes) {
      items.push({
        label: isEnglish ? "Total Time" : "总时长",
        value: `${detailNutrition.total_time_minutes} ${isEnglish ? "min" : "分钟"}`,
      });
    }

    if (detailNutrition.cook_time_minutes) {
      items.push({
        label: isEnglish ? "Cook" : "烹饪",
        value: `${detailNutrition.cook_time_minutes} ${isEnglish ? "min" : "分钟"}`,
      });
    }

    if (detailNutrition.prep_time_minutes) {
      items.push({
        label: isEnglish ? "Prep" : "准备",
        value: `${detailNutrition.prep_time_minutes} ${isEnglish ? "min" : "分钟"}`,
      });
    }

    if (detailNutrition.difficulty) {
      const label =
        detailNutrition.difficulty.charAt(0).toUpperCase() + detailNutrition.difficulty.slice(1);
      items.push({
        label: isEnglish ? "Difficulty" : "难度",
        value: isEnglish ? label : label.replace("Easy", "简单").replace("Medium", "中等").replace("Hard", "困难"),
      });
    }

    if (detailNutrition.allergens && detailNutrition.allergens.length) {
      items.push({
        label: isEnglish ? "Allergens" : "过敏原",
        value: detailNutrition.allergens.join(isEnglish ? ", " : "、"),
      });
    }

    return items;
  }, [detailNutrition, isEnglish]);

  const detailSections = useMemo(() => {
    if (!detail) return [] as Array<{ key: string; title: string; content: React.ReactNode }>;

    const sections: Array<{ key: string; title: string; content: React.ReactNode }> = [];

    if (nutritionItems.length) {
      sections.push({
        key: "nutrition",
        title: sectionTitle("nutrition"),
        content: (
          <ul style={nutritionListStyle}>
            {nutritionItems.map((item) => (
              <li key={item.label} style={nutritionListItemStyle}>
                <span style={nutritionLabelStyle}>{item.label}</span>
                <span>{item.value}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }

    sections.push({
      key: "ingredients",
      title: sectionTitle("ingredients"),
      content: (
        <ul style={detailListStyle}>
          {detail.ingredients.map((item, index) => (
            <li key={index}>{formatIngredient(item)}</li>
          ))}
        </ul>
      ),
    });

    sections.push({
      key: "instructions",
      title: sectionTitle("instructions"),
      content: (
        <ol style={detailOrderedListStyle}>
          {detail.instructions.map((step, index) => (
            <li key={index} style={detailStepItemStyle}>
              <span style={stepBadgeStyle}>{index + 1}</span>
              <span style={detailStepTextStyle}>{step}</span>
            </li>
          ))}
        </ol>
      ),
    });

    if (detailTips && detailTips.length) {
      sections.push({
        key: "tips",
        title: sectionTitle("tips"),
        content: (
          <ul style={tipsListStyle}>
            {detailTips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        ),
      });
    }

    return sections;
  }, [detail, detailTips, nutritionItems, isEnglish]);

  const detailMetaChips = useMemo(() => {
    if (!detail) return [] as Array<{ icon: string; text: string }>;
    const chips: Array<{ icon: string; text: string }> = [];
    const totalTime = detailNutrition?.total_time_minutes ?? computeRecipeTotalTime(detail);
    if (typeof totalTime === "number") {
      chips.push({ icon: "⏱", text: formatMinutes(totalTime) });
    }
    const servings = detailNutrition?.servings ?? detail.servings;
    if (typeof servings === "number") {
      chips.push({ icon: "🍽", text: formatServings(servings) });
    }
    const difficultyLabel = formatDifficultyLabel(detailNutrition?.difficulty ?? detail.difficulty_level);
    if (difficultyLabel) {
      chips.push({ icon: "⭐", text: difficultyLabel });
    }
    return chips;
  }, [detail, detailNutrition, isEnglish]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (!detail) {
      requestDisplayModeSafely("inline");
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    requestDisplayModeSafely("fullscreen");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetail(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      requestDisplayModeSafely("inline");
    };
  }, [detail]);

  const summaryText = useMemo(() => {
    if (typeof toolOutput.summary === "string" && toolOutput.summary.trim()) {
      return toolOutput.summary;
    }
    const params = toolOutput.params ?? {};
    const pieces: string[] = [];
    if (recipes.length) pieces.push(`${recipes.length} results`);
    if (typeof params.age_group === "string") {
      pieces.push(params.age_group.replace("STAGE_", "Stage "));
    } else if (typeof params.baby_age_months === "number") {
      pieces.push(`~${params.baby_age_months} months`);
    }
    if (typeof params.meal_type === "string" && params.meal_type) {
      pieces.push(`Meal: ${params.meal_type}`);
    }
    if (Array.isArray(params.allergens_to_avoid) && params.allergens_to_avoid.length) {
      pieces.push(`Avoid: ${params.allergens_to_avoid.join(", ")}`);
    }
    return pieces.length ? pieces.join(" · ") : "Adjust filters to discover more ideas.";
  }, [recipes.length, toolOutput.params, toolOutput.summary]);

  const closeDetail = () => {
    setDetail(null);
    setDetailNutrition(undefined);
    setDetailTips(undefined);
  };

  const handleSelect = async (recipe: RecipeSummary) => {
    setSelectedId(recipe.id);
    setLoadingId(recipe.id);
    setErrorMessage(null);

    try {
      const response = await window.openai?.callTool?.(
        "solidstart.recipes.getDetails",
        {
          recipe_id: recipe.id,
          ...(typeof activeLanguage === "string" && activeLanguage.length > 0
            ? { lang: activeLanguage }
            : undefined),
        },
      );

      const extracted = extractRecipeDetail(response);

      if (extracted && extracted.id) {
        setDetail(extracted);
        setDetailNutrition(extractNutrition(response));
        setDetailTips(extractTips(response));
      } else {
        setErrorMessage("无法加载食谱详情。返回的数据格式不正确。");
      }
    } catch (error) {
      console.error("❌ Failed to load recipe details", error);
      setErrorMessage(`无法加载食谱详情。错误: ${error}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
            <div>
              <h2 style={headerTitleStyle}>{isEnglish ? "Baby Recipes" : "宝宝辅食食谱"}</h2>
              <p style={headerSummaryStyle}>{summaryText}</p>
              {filterChips.length ? (
                <div style={filterBarStyle}>
                  {filterChips.map((chip) => (
                    <span key={chip} style={filterChipStyle}>
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
        {detail ? null : toolOutput.pagination ? (
          <p style={paginationStyle}>
            Page {toolOutput.pagination.page} / {toolOutput.pagination.total_pages} · Total {toolOutput.pagination.count}
          </p>
        ) : null}
      </header>

      {!recipes.length ? (
        <div style={emptyStateStyle}>
          <h3 style={emptyTitleStyle}>No recipes match your filters</h3>
          <p style={emptySubtitleStyle}>
            Try widening the age range or remove allergen filters—the carousel updates instantly.
          </p>
        </div>
      ) : (
        <div style={carouselOuterStyle}>
          <div style={carouselStyle}>
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                style={cardStyle(recipe.id === selectedId, focusedId === recipe.id)}
                role="button"
                tabIndex={0}
                aria-expanded={detail?.id === recipe.id}
                aria-controls={detail?.id === recipe.id ? "recipe-detail-dialog" : undefined}
                onClick={() => handleSelect(recipe)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(recipe);
                  }
                }}
                onFocus={() => setFocusedId(recipe.id)}
                onBlur={() => {
                  setFocusedId((current) => (current === recipe.id ? null : current));
                }}
              >
                <div style={cardImageContainerStyle}>
                  {recipe.thumbnail_url || recipe.image_url ? (
                    <img
                      src={recipe.thumbnail_url ?? recipe.image_url ?? ""}
                      alt={recipe.display_name}
                      style={cardImageStyle}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div style={imagePlaceholderStyle}>
                      <span style={placeholderTextStyle}>No Image</span>
                    </div>
                  )}
                </div>
                
                <div style={cardContentStyle}>
                  <div style={badgeRowStyle}>
                    <span style={stageBadgeStyle}>{recipe.age_group_label ?? recipe.age_group}</span>
                    {recipe.food_type ? <span style={tagBadgeStyle}>{recipe.food_type}</span> : null}
                  </div>
                  
                        <h3 style={cardTitleStyle}>{recipe.display_name}</h3>
                  
                  {recipe.description ? (
                    <p style={cardDescriptionStyle}>{recipe.description}</p>
                  ) : null}

                  <div style={metaRowStyle}>
                    {buildRecipeMeta(recipe).map((chip) => (
                      <span key={`${recipe.id}-${chip.icon}-${chip.text}`} style={metaChipStyle}>
                        {chip.icon} {chip.text}
                      </span>
                    ))}
                  </div>

                  {recipe.allergens && recipe.allergens.length ? (
                    <p style={alertLineStyle}>Contains {recipe.allergens.join(", ")}</p>
                  ) : null}

                  <div style={cardFooterStyle}>
                    <div style={statsStyle}>
                      <span>❤️ {recipe.likes_count ?? 0}</span>
                      <span>📌 {recipe.bookmarks_count ?? 0}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect(recipe);
                      }}
                      style={primaryButtonStyle}
                      disabled={loadingId === recipe.id}
                    >
                      {loadingId === recipe.id ? "Loading…" : "View Recipe"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {errorMessage ? (
        <div style={errorBannerStyle} role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      ) : null}

      {detail ? (
        <div
          style={detailOverlayStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={detailTitleId}
          aria-describedby={detail.description ? detailDescriptionId : undefined}
          id="recipe-detail-dialog"
          onClick={closeDetail}
        >
          <div
            style={detailCardStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <header style={detailHeaderStyle}>
              <div style={detailHeaderTextStyle}>
                <p style={detailStageStyle}>{detail.age_group_label ?? detail.age_group}</p>
                <h2 id={detailTitleId} style={detailTitleStyle}>
                  ✅ {detail.display_name ?? detail.name}
                </h2>
                {detail.description ? (
                  <p id={detailDescriptionId} style={detailDescriptionStyle}>
                    {detail.description}
                  </p>
                ) : null}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                style={detailCloseStyle}
                onClick={closeDetail}
              >
                ✕
              </button>
            </header>

            <div
              style={{
                ...detailBodyStyle,
                maxHeight: isCompact ? undefined : "calc(100vh - 320px)",
              }}
            >
              <div style={detailContentLayoutStyle}>
                <div style={detailMediaColumnStyle}>
                  <div style={detailGalleryStyle}>
                    <div style={heroImageWrapperStyle}>
                      {detail.image_url ? (
                        <img
                          src={detail.image_url}
                          alt={detail.display_name}
                          style={detailHeroImageStyle}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div style={heroPlaceholderStyle}>No image</div>
                      )}
                    </div>
                    {detail.gallery?.length ? (
                      <div style={galleryStripStyle}>
                        {detail.gallery.slice(0, 4).map((uri, index) => (
                          <img
                            key={index}
                            src={uri}
                            alt="recipe gallery"
                            style={galleryThumbStyle}
                            loading="lazy"
                            decoding="async"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={detailInfoColumnStyle}>
                  <div style={detailMetaRowStyle}>
                    {detailMetaChips.map((chip, index) => (
                      <span key={`${chip.icon}-${index}`} style={metaChipStyle}>
                        {chip.icon} {chip.text}
                      </span>
                    ))}
                  </div>

                  <section style={detailColumnsStyle}>
                    {detailSections.map((section) => (
                      <article key={section.key} style={detailColumnStyle}>
                        <h3 style={detailColumnTitleStyle}>{section.title}</h3>
                        {section.content}
                      </article>
                    ))}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function extractRecipeDetail(value: unknown): RecipeDetail | null {
  if (isRecord(value)) {
    const sc = value["structuredContent"];
    if (isRecord(sc) && isRecord(sc["recipe"])) {
      return sc["recipe"] as RecipeDetail;
    }
    if (isRecord(value["recipe"])) {
      return value["recipe"] as RecipeDetail;
    }
    const content = value["content"] as unknown;
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0];
      if (isRecord(first) && isRecord(first["recipe"])) {
        return first["recipe"] as RecipeDetail;
      }
    }
    if (isRecord(value) && typeof (value as { id?: unknown }).id === "string") {
      return value as RecipeDetail;
    }
  }
  return null;
}

function extractNutrition(value: unknown): RecipeDetailToolOutput["nutrition"] | undefined {
  if (!isRecord(value)) return undefined;
  const sc = value["structuredContent"];
  if (isRecord(sc) && sc["nutrition"] && typeof sc["nutrition"] === "object") {
    return sc["nutrition"] as RecipeDetailToolOutput["nutrition"];
  }
  if (isRecord(value["nutrition"])) {
    return value["nutrition"] as RecipeDetailToolOutput["nutrition"];
  }
  return undefined;
}

function extractTips(value: unknown): string[] | undefined {
  if (!isRecord(value)) return undefined;
  const sc = value["structuredContent"];
  if (isRecord(sc) && Array.isArray(sc["tips"])) {
    return sc["tips"] as string[];
  }
  if (Array.isArray(value["tips"])) {
    return value["tips"] as string[];
  }
  return undefined;
}

const containerStyle: React.CSSProperties = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  minHeight: "auto", // 移除固定高度，让内容自适应
  maxHeight: "none", // 确保没有最大高度限制
  overflow: "visible", // 确保内容正常显示
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 700,
  color: TEXT,
};

const headerSummaryStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "0.9rem",
  color: MUTED,
  lineHeight: 1.4,
};

const filterBarStyle: React.CSSProperties = {
  marginTop: "10px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const filterChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "rgba(14, 165, 233, 0.1)",
  color: ACCENT,
  fontSize: "0.75rem",
  fontWeight: 600,
};

const paginationStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  color: MUTED,
  fontStyle: "italic",
};

const carouselOuterStyle: React.CSSProperties = {
  paddingBottom: "8px",
};

const carouselStyle: React.CSSProperties = {
  display: "flex",
  gap: "16px",
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  paddingBottom: "8px",
};

const cardStyle = (selected: boolean, focused: boolean): React.CSSProperties => ({
  minWidth: "320px",
  maxWidth: "320px",
  scrollSnapAlign: "start",
  borderRadius: "16px",
  border: `1px solid ${selected || focused ? ACCENT : BORDER}`,
  backgroundColor: "#ffffff",
  boxShadow:
    selected || focused
      ? "0 0 0 3px rgba(14,165,233,0.15), 0 4px 12px rgba(15,23,42,0.1)"
      : "0 2px 8px rgba(15,23,42,0.06)",
  outline: focused ? "3px solid rgba(14,165,233,0.35)" : "none",
  outlineOffset: "2px",
  padding: "16px",
  display: "flex",
  flexDirection: "row",
  gap: "16px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  alignItems: "flex-start",
});

const cardImageContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "120px",
  height: "120px",
  borderRadius: "12px",
  overflow: "hidden",
  backgroundColor: ACCENT_SOFT,
};

const cardImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f1f5f9",
};

const placeholderTextStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: MUTED,
  fontWeight: 500,
};

const cardContentStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const stageBadgeStyle: React.CSSProperties = {
  backgroundColor: ACCENT_SOFT,
  color: ACCENT,
  borderRadius: "999px",
  padding: "3px 10px",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tagBadgeStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  color: MUTED,
  borderRadius: "999px",
  padding: "3px 8px",
  fontSize: "0.72rem",
  fontWeight: 500,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 600,
  color: TEXT,
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const cardDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.85rem",
  color: MUTED,
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  fontSize: "0.75rem",
};

const metaChipStyle: React.CSSProperties = {
  background: "linear-gradient(120deg, #bae6fd 0%, #e0f2fe 100%)",
  color: TEXT,
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: 600,
  fontSize: "0.8rem",
  boxShadow: "0 4px 12px rgba(14,165,233,0.25)",
};

const alertLineStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  color: "#dc2626",
  fontWeight: 500,
};

const cardFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: "auto",
};

const statsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  fontSize: "0.75rem",
  color: MUTED,
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: ACCENT,
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 16px",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.2s ease",
};

const errorBannerStyle: React.CSSProperties = {
  marginTop: "12px",
  borderRadius: "12px",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  padding: "12px 16px",
  fontSize: "0.85rem",
  fontWeight: 500,
};

const emptyStateStyle: React.CSSProperties = {
  border: `2px dashed ${BORDER}`,
  borderRadius: "16px",
  padding: "40px 20px",
  textAlign: "center",
  color: MUTED,
  backgroundColor: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 600,
  color: TEXT,
  fontSize: "1.1rem",
};

const emptySubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  lineHeight: 1.4,
};

const detailOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 10px 150px",
  zIndex: 999999,
  backdropFilter: "blur(10px)",
  overflowY: "auto",
};

const detailCardStyle: React.CSSProperties = {
  width: "min(700px, calc(100vw - 48px))",
  maxHeight: "calc(100vh - 220px)",
  minHeight: "min(70vh, 520px)",
  overflow: "hidden",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: "22px",
  border: `1px solid rgba(226, 232, 240, 0.8)` ,
  boxShadow: "0 24px 50px rgba(15,23,42,0.21)",
  padding: "24px 26px 30px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  margin: "0 auto 40px",
};

const detailHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  position: "relative",
};

const detailStageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.66rem",
  letterSpacing: "0.12em",
  color: ACCENT,
  textTransform: "uppercase",
  fontWeight: 700,
};

const detailHeaderTextStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flex: 1,
};

const detailTitleStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "1.8rem",
  fontWeight: 700,
  color: TEXT,
  lineHeight: 1.18,
};

const detailDescriptionStyle: React.CSSProperties = {
  margin: "2px 0 0 0",
  color: MUTED,
  fontSize: "0.95rem",
  lineHeight: 1.48,
};

const detailBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  overflowY: "auto",
  paddingRight: "8px",
  flex: 1,
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(148, 163, 184, 0.8) transparent",
};

const detailCloseStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  fontSize: "1.2rem",
  cursor: "pointer",
  color: MUTED,
  position: "absolute",
  top: 0,
  right: 0,
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  transition: "background-color 0.2s ease",
};

const detailGalleryStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  backgroundColor: "#e0f2fe",
  borderRadius: "20px",
  padding: "22px",
  boxShadow: "inset 0 0 0 1px rgba(14,165,233,0.08)",
};

const heroImageWrapperStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "18px",
  overflow: "hidden",
  backgroundColor: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${BORDER}`,
  padding: "8px 14px",
};

const detailHeroImageStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  maxHeight: "520px",
  objectFit: "contain",
  display: "block",
  borderRadius: "12px",
  boxShadow: "0 20px 44px rgba(15,23,42,0.2)",
};

const heroPlaceholderStyle: React.CSSProperties = {
  ...detailHeroImageStyle,
  color: MUTED,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1rem",
  fontWeight: 500,
};

const galleryStripStyle: React.CSSProperties = {
  display: "flex",
  gap: "14px",
};

const galleryThumbStyle: React.CSSProperties = {
  width: "104px",
  height: "104px",
  borderRadius: "16px",
  objectFit: "cover",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
  border: `1px solid ${BORDER}`,
};

const detailMetaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  padding: "12px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(147, 197, 253, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
};

const detailColumnsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
};

const detailColumnStyle: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.82)",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.8)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "0 16px 32px rgba(15,23,42,0.12)",
};

const detailColumnTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.1rem",
  fontWeight: 600,
  color: TEXT,
};

const nutritionListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "0.95rem",
};

const nutritionListItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: TEXT,
};

const nutritionLabelStyle: React.CSSProperties = {
  color: MUTED,
};

const detailListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "0.95rem",
  color: TEXT,
  lineHeight: 1.6,
};

const detailOrderedListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  listStyle: "none",
  color: TEXT,
  counterReset: "step",
};

const detailStepItemStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  color: TEXT,
};

const detailStepTextStyle: React.CSSProperties = {
  flex: 1,
  lineHeight: 1.5,
  fontSize: "0.95rem",
  color: "#1f2937",
};

const stepBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)",
  color: "white",
  fontWeight: 700,
  fontSize: "0.85rem",
  flexShrink: 0,
  boxShadow: "0 8px 16px rgba(14,165,233,0.4)",
};

const tipsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  color: TEXT,
  fontSize: "0.95rem",
};

function formatIngredient(item: Record<string, unknown>): string {
  if (typeof item === "string") return item;
  const parts: string[] = [];
  if (item && typeof item === "object") {
    if ("quantity" in item && item.quantity) {
      parts.push(String(item.quantity));
    }
    if ("name" in item && item.name) {
      parts.push(String(item.name));
    }
    if ("notes" in item && item.notes) {
      parts.push(`(${String(item.notes)})`);
    }
  }
  return parts.length ? parts.join(" ") : JSON.stringify(item);
}

function requestDisplayModeSafely(mode: DisplayMode) {
  const fn = window.openai?.requestDisplayMode;
  if (!fn) return;

  try {
    const result = fn({ mode });
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      (result as Promise<unknown>).catch(() => undefined);
    }
  } catch (error) {
    console.warn("Failed to request display mode", error);
  }
}

const mountNode = document.getElementById("root");

if (mountNode) {
  createRoot(mountNode).render(<RecipeCarouselV4 />);
}
