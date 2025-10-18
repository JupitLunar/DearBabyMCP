# MCP Tooling Strategy

This document captures the end-to-end plan for exposing Dear Baby experiences through a unified MCP server. It reflects the current priority to launch with Solid Start recipes, while documenting the broader roadmap for trackers, knowledge content, and intelligent assistance.

## 1. Rollout Phases

| Phase | Focus | Highlights | Target Duration |
| --- | --- | --- | --- |
| **Phase 0 – Foundations** | Project scaffolding | Repo layout, API credential management, MVP scope sign-off | Day 0‑1 |
| **Phase 1 – Solid Start MVP** | Recipe discovery | `search_recipes`, `recipes.featured`, `recipes.getDetails`, `recipes.toggleBookmark/Like` | Day 2‑10 |
| **Phase 2 – Interaction Boost** | Rich UI + safety | Widget filters, `check_food_safety`, improved error states, telemetry | Day 11‑15 |
| **Phase 3 – Tracker Integration** | BabyAgent read/write | `get_baby_summary`, `log_baby_activity`, `analyze_patterns` | TBD |
| **Phase 4 – Knowledge & Intelligence** | Knowledgebase + AI plans | `search_health_articles`, `get_article_details`, `generate_personalized_plan` | TBD |

> The first release (Phase 1) will ship a best-in-class recipe interface inside ChatGPT. Subsequent phases can be scheduled based on adoption and resource availability.

## 2. Tool Catalog

### 2.1 Solid Start (Priority for Phase 1)

| Tool | Purpose | Key Inputs | Output & UI Notes |
| --- | --- | --- | --- |
| `solidstart.recipes.search` | Discover recipes by age, allergen, meal type | `baby_age_months`, `allergens_to_avoid?`, `meal_type?`, `query?` | Inline carousel with age/allergen badges; supports follow-up selection |
| `solidstart.recipes.featured` | Spotlight curated recipes | `limit?` | Hero carousel or grid for quick entry points |
| `solidstart.recipes.getDetails` | Detailed view of a specific recipe | `recipe_id` | Fullscreen reader with ingredients, steps, nutrition, related recipes |
| `solidstart.recipes.toggleBookmark` | Save/unsave a recipe | `recipe_id`, `action` (`bookmark`/`unbookmark`) | Write tool with confirmation copy; updates detail widget state |
| `solidstart.recipes.toggleLike` | Like/unlike a recipe | `recipe_id`, `action` (`like`/`unlike`) | Same as above; ensures idempotency and status messaging |
| `solidstart.recipes.getAllergenGuide` *(Phase 2+)* | Guide for introducing a common allergen | `allergen`, `baby_age_months` | Step-by-step instructions + related recipes |
| `solidstart.food.checkSafety` *(Phase 2+)* | Evaluate a food’s safety for a given age | `food_name`, `baby_age_months` | Returns Safe/Warning/Not Recommended with rationale |
| `solidstart.mealPlan.create` *(Phase 3+)* | Generate a weekly meal plan | `baby_age_months`, `preferences?`, `restrictions?` | Calendar-style view + downloadable list |

### 2.2 Tracker (BabyAgent) – Future Phases

| Tool | Purpose | Inputs | Output & UI |
| --- | --- | --- | --- |
| `tracker.logActivity` | Record feeding/sleep/diaper/milestone | `activity_type`, `timestamp?`, activity-specific `details` | Confirmation card + refreshed daily stats |
| `tracker.getSummary` | Aggregate stats (today/7 days/30 days) | `time_range`, `data_types?` | Charts + anomaly callouts |
| `tracker.getGrowthInsights` | Growth curves and milestone progress | `baby_id` | Trend analysis + personalized advice |
| `tracker.analyzePatterns` | AI-led pattern detection | `baby_id`, `analysis_type` | Insights with suggested actions |

### 2.3 Knowledgebase – Optional Add-on

| Tool | Purpose | Inputs | Output & UI |
| --- | --- | --- | --- |
| `knowledge.searchArticles` | Search evidence-based articles | `query`, `hub?`, `age_range?` | Article cards with key facts and citation badges |
| `knowledge.getArticleDetails` | Retrieve full article content | `article_id` | Rich reader with QA, references, related links |

### 2.4 Intelligent Assistant – Cross-Capability

| Tool | Purpose | Inputs | Output & UI |
| --- | --- | --- | --- |
| `assistant.generatePlan` | Personalized plan (sleep/feeding/solids) | `plan_type`, `baby_age_months`, `current_data?` | Action plan combining knowledge + tracker + recipes |
| `assistant.quickSearch` | Search across all data sources | `query` | Blended results (articles, recipes, logs) with filters |

## 3. UI & Experience Considerations

- **Display Modes:** Recipes lean on inline carousels and fullscreen detail views. Trackers may introduce charts and timeline widgets. Future PiP usage reserved for live coaching or timers.
- **Component Strategy:** Maintain a React component library compiled with esbuild. Components consume `window.openai.toolOutput` and can trigger `window.openai.callTool` for widget-accessible flows.
- **Accessibility & Branding:** Respect ChatGPT visual guidelines (system fonts, contrast). Use Dear Baby accent colors sparingly (badges, icons). Provide alt text and responsive layouts.

## 4. Security, Auth, and Compliance

- Phase 1 tools rely on Solid Start APIs. Confirm authentication scheme (API token or OAuth). Encapsulate token management in the integrations layer.
- For write tools (bookmark/like/log activity), set `securitySchemes` and provide clear confirmation copy via `_meta["openai/toolInvocation/*"]`.
- Prepare privacy policy addendum covering data shared via ChatGPT. Ensure logs redact PII and store audit trails for write actions.

## 5. Testing & Launch Checklist

- Unit and integration tests for each tool handler (schema validation, error paths).
- Manual validation using MCP Inspector and ChatGPT Developer Mode (web + mobile).
- Document regression prompts for discovery accuracy and UX verification.
- Capture screenshots/video for directory submission once Apps review opens.

## 6. Current Priorities

1. Finalize Phase 1 tool specs (`search`, `featured`, `getDetails`, `toggleBookmark/Like`).
2. Scaffold MCP server and React widgets per roadmap.
3. Validate end-to-end via Developer Mode and gather feedback.
4. Decide on Phase 2 scope (food safety and allergen guide) based on MVP adoption.

---

## Daily To-Do (Oct 17)

1. ✅ Sync updated pain-point dataset into Supabase (`npm run ingest:pain:en`) and verify `/api/ai-feed`.
2. 🔄 Capture homepage screenshots after testimonial simplification; update marketing deck.
3. 🔄 Draft `/pain-points` landing page wireframe highlighting top scenarios + AI CTA.
4. 📝 Outline caregiver email drip (welcome + weekly “Top 3 questions”).
5. 📊 Set up dashboard baseline: Supabase article reads, AI queries, search impressions.
