import { createRoot } from "react-dom/client";
import React, { useCallback, useMemo } from "react";
import { useToolOutput } from "./useOpenAiGlobals";
import "./openaiBridge";
import type { RecipeDetail, RecipeDetailToolOutput } from "./types";

const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#0ea5e9";
const ACCENT_SOFT = "#e0f2fe";

const RecipeDetailV4: React.FC = () => {
  const toolOutput = useToolOutput<RecipeDetailToolOutput>({
    recipe: {
      id: "",
      name: "",
      display_name: "",
      ingredients: [],
      instructions: [],
      age_group: "STAGE_1",
    },
  });

  const recipe = useMemo(
    () => (toolOutput && "recipe" in toolOutput ? toolOutput.recipe : toolOutput),
    [toolOutput],
  );

  // 如果没有有效的食谱数据，显示加载状态
  if (!recipe || !recipe.id) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: "48px", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: TEXT }}>Loading recipe…</h2>
          <p style={{ color: MUTED, marginTop: "12px", fontSize: "0.95rem" }}>
            Sit tight—full instructions and ingredient details will appear here in a moment.
          </p>
        </div>
      </div>
    );
  }

  const handleBookmarkToggle = useCallback(
    async (bookmarked: boolean) => {
      await window.openai?.callTool?.("solidstart.recipes.toggleBookmark", {
        recipe_id: recipe.id,
        bookmarked,
      });
    },
    [recipe.id],
  );

  const handleLikeToggle = useCallback(
    async (liked: boolean) => {
      await window.openai?.callTool?.("solidstart.recipes.toggleLike", {
        recipe_id: recipe.id,
        liked,
      });
    },
    [recipe.id],
  );

  const handleBackToList = useCallback(async () => {
    await window.openai?.requestDisplayMode?.({ mode: "inline" });
  }, []);

  return (
    <div style={pageStyle}>
      <header style={heroStyle}>
        <div style={heroImageSectionStyle}>
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.display_name ?? recipe.name}
              style={heroImageStyle}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div style={heroImagePlaceholderStyle}>No image available</div>
          )}
          {recipe.gallery && recipe.gallery.length > 0 && (
            <div style={galleryStripStyle}>
              {recipe.gallery.slice(0, 4).map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Recipe step ${index + 1}`}
                  style={galleryThumbnailStyle}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}
        </div>
        <div style={heroInfoStyle}>
          <p style={stageStyle}>{recipe.age_group_label ?? recipe.age_group}</p>
          <h1 style={heroTitleStyle}>{recipe.display_name ?? recipe.name}</h1>
          {recipe.description ? <p style={heroDescriptionStyle}>{recipe.description}</p> : null}
          <div style={heroMetaRowStyle}>
            {recipe.total_time_minutes ? (
              <span style={heroMetaChipStyle}>{recipe.total_time_minutes} minutes</span>
            ) : null}
            {recipe.servings ? (
              <span style={heroMetaChipStyle}>{recipe.servings} servings</span>
            ) : null}
            {recipe.difficulty_level ? (
              <span style={heroMetaChipStyle}>Difficulty: {recipe.difficulty_level}</span>
            ) : null}
          </div>
        </div>
        <div style={heroActionsStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={handleBackToList}>
            ← Back to Recipes
          </button>
          <div style={primaryActionRowStyle}>
            <button type="button" style={primaryButtonStyle} onClick={() => handleBookmarkToggle(true)}>
              Bookmark
            </button>
            <button type="button" style={ghostButtonStyle} onClick={() => handleBookmarkToggle(false)}>
              Remove Bookmark
            </button>
          </div>
          <div style={primaryActionRowStyle}>
            <button type="button" style={likeButtonStyle} onClick={() => handleLikeToggle(true)}>
              Like
            </button>
            <button type="button" style={ghostButtonStyle} onClick={() => handleLikeToggle(false)}>
              Unlike
            </button>
          </div>
        </div>
      </header>

      <section style={infoSectionStyle}>
        <div style={infoCardStyle}>
          <h2 style={infoTitleStyle}>Key Information</h2>
          <dl style={infoListStyle}>
            {recipe.source ? (
              <div style={infoItemStyle}>
                <dt style={infoLabelStyle}>Source</dt>
                <dd style={infoValueStyle}>{recipe.source === "manual" ? "Nutritionist Selected" : recipe.source}</dd>
              </div>
            ) : null}
            {recipe.likes_count != null ? (
              <div style={infoItemStyle}>
                <dt style={infoLabelStyle}>Likes</dt>
                <dd style={infoValueStyle}>{recipe.likes_count}</dd>
              </div>
            ) : null}
            {recipe.bookmarks_count != null ? (
              <div style={infoItemStyle}>
                <dt style={infoLabelStyle}>Bookmarks</dt>
                <dd style={infoValueStyle}>{recipe.bookmarks_count}</dd>
              </div>
            ) : null}
            {recipe.made_count != null ? (
              <div style={infoItemStyle}>
                <dt style={infoLabelStyle}>Times Made</dt>
                <dd style={infoValueStyle}>{recipe.made_count}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div style={infoCardStyle}>
          <h2 style={infoTitleStyle}>Nutrition & Safety</h2>
          <ul style={infoBulletListStyle}>
            {recipe.calories_per_serving != null ? (
              <li>Approx. {recipe.calories_per_serving} calories per serving</li>
            ) : (
              <li>Made with natural ingredients, perfect for babies starting solid foods.</li>
            )}
            {recipe.allergens && recipe.allergens.length ? (
              <li style={alertTextStyle}>Contains allergens: {recipe.allergens.join(", ")}. Consult your doctor if your baby has allergies.</li>
            ) : (
              <li>Free from common allergens, safe for first-time food introduction.</li>
            )}
            {recipe.safety_notes ? <li>{recipe.safety_notes}</li> : null}
          </ul>
        </div>
      </section>

      <section style={contentLayoutStyle}>
        <article style={columnCardStyle}>
          <h2 style={columnTitleStyle}>Ingredients</h2>
          <ul style={ingredientListStyle}>
            {recipe.ingredients.map((item, index) => (
              <li key={index} style={ingredientItemStyle}>
                {formatIngredient(item)}
              </li>
            ))}
          </ul>
        </article>

        <article style={columnCardStyle}>
          <h2 style={columnTitleStyle}>Instructions</h2>
          <ol style={stepListStyle}>
            {recipe.instructions.map((step, index) => (
              <li key={index} style={stepItemStyle}>
                <span style={stepBadgeStyle}>{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: TEXT,
  minHeight: "100vh",
  padding: "24px",
  background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "20px",
  backgroundColor: "white",
  borderRadius: "20px",
  border: `1px solid ${BORDER}`,
  padding: "28px",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
};

const heroImageSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: "300px",
  maxWidth: "400px",
  flex: "1",
};

const heroImageStyle: React.CSSProperties = {
  width: "100%",
  height: "280px",
  objectFit: "contain",
  borderRadius: "16px",
  backgroundColor: "#f8fafc",
  border: `1px solid ${BORDER}`,
};

const heroImagePlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "280px",
  backgroundColor: "#f8fafc",
  border: `1px solid ${BORDER}`,
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: MUTED,
  fontSize: "0.9rem",
};

const galleryStripStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
};

const galleryThumbnailStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  objectFit: "cover",
  borderRadius: "12px",
  border: `1px solid ${BORDER}`,
  flexShrink: 0,
};

const heroInfoStyle: React.CSSProperties = {
  maxWidth: "600px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const stageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: ACCENT,
  fontWeight: 600,
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "2rem",
  fontWeight: 700,
  color: TEXT,
  lineHeight: 1.2,
};

const heroDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  color: MUTED,
  lineHeight: 1.6,
};

const heroMetaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const heroMetaChipStyle: React.CSSProperties = {
  backgroundColor: ACCENT_SOFT,
  color: ACCENT,
  borderRadius: "999px",
  padding: "6px 14px",
  fontSize: "0.85rem",
  fontWeight: 600,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: "white",
  color: ACCENT,
  border: `1px solid ${ACCENT}`,
  borderRadius: "12px",
  padding: "10px 18px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
  transition: "all 0.2s ease",
};

const primaryActionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: ACCENT,
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px 18px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
  transition: "background-color 0.2s ease",
};

const likeButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: "#f97316",
};

const ghostButtonStyle: React.CSSProperties = {
  backgroundColor: "white",
  color: MUTED,
  border: `1px dashed ${BORDER}`,
  borderRadius: "12px",
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: "0.9rem",
  transition: "all 0.2s ease",
};

const infoSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
};

const infoCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "18px",
  border: `1px solid ${BORDER}`,
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
};

const infoTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.1rem",
  fontWeight: 600,
  color: TEXT,
};

const infoListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const infoItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  fontSize: "0.9rem",
};

const infoLabelStyle: React.CSSProperties = {
  color: MUTED,
  margin: 0,
  fontWeight: 500,
};

const infoValueStyle: React.CSSProperties = {
  color: TEXT,
  margin: 0,
  fontWeight: 600,
};

const infoBulletListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  color: TEXT,
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const alertTextStyle: React.CSSProperties = {
  color: "#dc2626",
  fontWeight: 600,
};

const contentLayoutStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
};

const columnCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "20px",
  border: `1px solid ${BORDER}`,
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
};

const columnTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: 600,
  color: TEXT,
};

const ingredientListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  fontSize: "1rem",
};

const ingredientItemStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  backgroundColor: "#f8fafc",
  border: `1px solid ${BORDER}`,
  fontSize: "0.95rem",
  lineHeight: 1.4,
};

const stepListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const stepItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
  border: `1px solid ${BORDER}`,
  borderRadius: "16px",
  padding: "16px",
  backgroundColor: "#ffffff",
};

const stepBadgeStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: ACCENT,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.9rem",
  flexShrink: 0,
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

const mountNode = document.getElementById("root");

if (mountNode) {
  createRoot(mountNode).render(<RecipeDetailV4 />);
}
