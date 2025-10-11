import { createRoot } from "react-dom/client";
import React, { useMemo } from "react";
import { useToolOutput } from "./useOpenAiGlobals";
import "./openaiBridge";
import type { RecipeDetail, RecipeDetailToolOutput } from "./types";

const TEXT_COLOR = "#0f172a";
const MUTED_TEXT = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#0ea5e9";

const App: React.FC = () => {
  const toolOutput = useToolOutput<RecipeDetailToolOutput>({
    recipe: {
      id: "",
      name: "",
      display_name: "Recipe",
      ingredients: [],
      instructions: [],
      age_group: "STAGE_1",
    },
  });

  const recipe = useMemo(() => toolOutput.recipe, [toolOutput.recipe]);

  const handleBookmarkToggle = async (bookmarked: boolean) => {
    await window.openai?.callTool?.("solidstart.recipes.toggleBookmark", {
      recipe_id: recipe.id,
      bookmarked,
    });
  };

  const handleLikeToggle = async (liked: boolean) => {
    await window.openai?.callTool?.("solidstart.recipes.toggleLike", {
      recipe_id: recipe.id,
      liked,
    });
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={stageStyle}>{recipe.age_group_label ?? recipe.age_group}</p>
          <h1 style={titleStyle}>{recipe.display_name ?? recipe.name}</h1>
          {recipe.description ? (
            <p style={descriptionStyle}>{recipe.description}</p>
          ) : null}
        </div>
        <div style={actionsStyle}>
          <button type="button" style={actionButtonStyle} onClick={() => handleBookmarkToggle(true)}>
            Bookmark
          </button>
          <button type="button" style={outlineButtonStyle} onClick={() => handleBookmarkToggle(false)}>
            Remove
          </button>
          <button type="button" style={likeButtonStyle} onClick={() => handleLikeToggle(true)}>
            Like
          </button>
          <button type="button" style={outlineButtonStyle} onClick={() => handleLikeToggle(false)}>
            Unlike
          </button>
        </div>
      </header>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Ingredients</h2>
        <ul style={listStyle}>
          {recipe.ingredients.map((item, index) => (
            <li key={index} style={listItemStyle}>
              {formatIngredient(item)}
            </li>
          ))}
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Instructions</h2>
        <ol style={orderedListStyle}>
          {recipe.instructions.map((step, index) => (
            <li key={index} style={orderedListItemStyle}>
              <span style={stepNumberStyle}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Nutrition & Notes</h2>
        <div style={infoGridStyle}>
          {recipe.calories_per_serving != null ? (
            <div style={infoCardStyle}>
              <span style={infoLabelStyle}>Calories</span>
              <span style={infoValueStyle}>{recipe.calories_per_serving} kcal</span>
            </div>
          ) : null}
          {recipe.servings ? (
            <div style={infoCardStyle}>
              <span style={infoLabelStyle}>Servings</span>
              <span style={infoValueStyle}>{recipe.servings}</span>
            </div>
          ) : null}
          {recipe.total_time_minutes ? (
            <div style={infoCardStyle}>
              <span style={infoLabelStyle}>Total Time</span>
              <span style={infoValueStyle}>{recipe.total_time_minutes} min</span>
            </div>
          ) : null}
          {recipe.difficulty_level ? (
            <div style={infoCardStyle}>
              <span style={infoLabelStyle}>Difficulty</span>
              <span style={infoValueStyle}>{recipe.difficulty_level}</span>
            </div>
          ) : null}
        </div>
        {recipe.allergens && recipe.allergens.length ? (
          <div style={noteBoxStyle}>
            <strong>Allergens:</strong> {recipe.allergens.join(", ")}
          </div>
        ) : null}
        {recipe.safety_notes ? (
          <div style={noteBoxStyle}>
            <strong>Safety Notes:</strong> {recipe.safety_notes}
          </div>
        ) : null}
      </section>
    </div>
  );
};

function formatIngredient(item: Record<string, unknown>): string {
  if (typeof item === "string") {
    return item;
  }
  if (item && typeof item === "object") {
    const quantity = "quantity" in item ? String(item.quantity) : "";
    const name = "name" in item ? String(item.name) : "";
    const notes = "notes" in item ? String(item.notes) : "";
    return [quantity, name, notes].filter(Boolean).join(" ");
  }
  return JSON.stringify(item);
}

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: TEXT_COLOR,
  backgroundColor: "#f8fafc",
  minHeight: "100vh",
  padding: "24px",
  lineHeight: 1.6,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  marginBottom: "24px",
  borderBottom: `1px solid ${BORDER}`,
  paddingBottom: "16px",
};

const stageStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "0.75rem",
  color: MUTED_TEXT,
  margin: 0,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.75rem",
  fontWeight: 700,
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: MUTED_TEXT,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const actionButtonBase: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 16px",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const actionButtonStyle: React.CSSProperties = {
  ...actionButtonBase,
  backgroundColor: ACCENT,
  color: "white",
};

const outlineButtonStyle: React.CSSProperties = {
  ...actionButtonBase,
  backgroundColor: "white",
  color: ACCENT,
  borderColor: ACCENT,
};

const likeButtonStyle: React.CSSProperties = {
  ...actionButtonBase,
  backgroundColor: "#f97316",
  color: "white",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  marginBottom: "12px",
};

const listStyle: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: "20px",
  margin: 0,
  color: TEXT_COLOR,
};

const listItemStyle: React.CSSProperties = {
  marginBottom: "6px",
};

const orderedListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const orderedListItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "12px",
  border: `1px solid ${BORDER}`,
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
};

const stepNumberStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: ACCENT,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const infoCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  border: `1px solid ${BORDER}`,
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  boxShadow: "0 1px 1px rgba(15,23,42,0.04)",
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: MUTED_TEXT,
};

const infoValueStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: TEXT_COLOR,
};

const noteBoxStyle: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  color: "#92400e",
  borderRadius: "12px",
  padding: "12px",
  border: "1px solid #fcd34d",
  marginTop: "8px",
};

const mountNode = document.getElementById("root");

if (mountNode) {
  createRoot(mountNode).render(<App />);
}
