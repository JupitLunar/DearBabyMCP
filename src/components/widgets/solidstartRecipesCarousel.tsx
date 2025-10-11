import { createRoot } from "react-dom/client";
import React, { useMemo, useState } from "react";
import { useToolOutput } from "./useOpenAiGlobals";
import "./openaiBridge";
import type { RecipeSummary, RecipesToolOutput } from "./types";

const CARD_BG = "#ffffff";
const CARD_BORDER = "#e5e7eb";
const TEXT_COLOR = "#111827";
const MUTED_TEXT = "#6b7280";
const ACCENT = "#10b981";

const App: React.FC = () => {
  const toolOutput = useToolOutput<RecipesToolOutput>({ recipes: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const displayRecipes = useMemo(() => toolOutput.recipes ?? [], [toolOutput.recipes]);

  const handleSelect = async (recipe: RecipeSummary) => {
    setSelectedId(recipe.id);

    try {
      await window.openai?.requestDisplayMode?.({ mode: "fullscreen" });
    } catch (error) {
      console.warn("Failed to request fullscreen mode", error);
    }

    try {
      await window.openai?.callTool?.("solidstart.recipes.getDetails", {
        recipe_id: recipe.id,
      });
    } catch (error) {
      console.error("Failed to load recipe details", error);
    }
  };

  if (!displayRecipes.length) {
    return (
      <div style={containerStyle}>
        <p style={mutedStyle}>No recipes found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {displayRecipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => handleSelect(recipe)}
            style={cardStyle(recipe.id === selectedId)}
          >
            {recipe.thumbnail_url ? (
              <img
                src={recipe.thumbnail_url}
                alt={recipe.display_name}
                style={imageStyle}
              />
            ) : (
              <div style={imagePlaceholderStyle}>No image</div>
            )}
            <div style={cardBodyStyle}>
              <span style={badgeStyle}>{recipe.age_group_label ?? recipe.age_group}</span>
              <h3 style={titleStyle}>{recipe.display_name}</h3>
              {recipe.description ? (
                <p style={descriptionStyle}>{recipe.description}</p>
              ) : null}
              <div style={metaRowStyle}>
                {recipe.total_time_minutes ? (
                  <span style={metaItemStyle}>{recipe.total_time_minutes} min</span>
                ) : null}
                {recipe.servings ? (
                  <span style={metaItemStyle}>{recipe.servings} servings</span>
                ) : null}
                {recipe.difficulty_level ? (
                  <span style={metaItemStyle}>{recipe.difficulty_level}</span>
                ) : null}
              </div>
              {recipe.allergens && recipe.allergens.length ? (
                <div style={allergenContainerStyle}>
                  <span style={mutedSmallStyle}>Allergens:</span>
                  <span style={allergenListStyle}>{recipe.allergens.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  padding: "12px",
  backgroundColor: "transparent",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "12px",
};

const cardStyle = (selected: boolean): React.CSSProperties => ({
  textAlign: "left",
  borderRadius: "16px",
  border: `1px solid ${selected ? ACCENT : CARD_BORDER}`,
  backgroundColor: CARD_BG,
  cursor: "pointer",
  padding: 0,
  overflow: "hidden",
  boxShadow: selected ? "0 0 0 3px rgba(16,185,129,0.2)" : "0 1px 2px rgba(15,23,42,0.1)",
  transition: "transform 0.1s ease, box-shadow 0.1s ease",
  display: "flex",
  flexDirection: "column",
});

const imageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover",
};

const imagePlaceholderStyle: React.CSSProperties = {
  ...imageStyle,
  backgroundColor: "#f3f4f6",
  color: MUTED_TEXT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.85rem",
};

const cardBodyStyle: React.CSSProperties = {
  padding: "12px",
  color: TEXT_COLOR,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flexGrow: 1,
};

const badgeStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  backgroundColor: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "2px 10px",
  fontSize: "0.75rem",
  fontWeight: 600,
};

const titleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  margin: 0,
  color: TEXT_COLOR,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: MUTED_TEXT,
  margin: 0,
  lineHeight: 1.4,
  flexGrow: 1,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  fontSize: "0.8rem",
  color: MUTED_TEXT,
};

const metaItemStyle: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "999px",
  padding: "2px 8px",
};

const allergenContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const allergenListStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#dc2626",
};

const mutedSmallStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: MUTED_TEXT,
};

const mutedStyle: React.CSSProperties = {
  color: MUTED_TEXT,
  fontSize: "0.9rem",
};

const mountNode = document.getElementById("root");

if (mountNode) {
  createRoot(mountNode).render(<App />);
}
