# Dear Baby MCP Roadmap

## Project Goal
Stand up a dedicated MCP server that connects Dear Baby’s ecosystem to ChatGPT, starting with the Solid Start recipe experience and expanding later to baby tracking and personalized guidance.

## Phase 0 · Kickoff (Day 0‑1)
- Finalize repo structure, tech stack (TypeScript, `@modelcontextprotocol/sdk`, axios, React/Skybridge components).
- Collect Solid Start API credentials/limits and confirm example responses.
- Lock MVP scope: recipe search, featured list, recipe detail, and bookmark/like interactions.

## Phase 1 · Infrastructure (Day 2‑4)
- Initialize codebase structure:
  - `src/server/index.ts` – server bootstrap.
  - `src/server/tools/*` – tool registrations.
  - `src/integrations/solidstart/*` – REST client wrappers.
  - `src/components/*` – Skybridge widgets.
- Set up configuration (`dotenv`, zod validation), logging (pino), lint/test scripts.
- Add HTTP client with shared error handling and telemetry hooks.

## Phase 2 · Solid Start Recipe MVP (Day 5‑10)
1. `solidstart.recipes.search`
   - Inputs: baby age (months), allergens, meal type, free-text query.
   - Output: recipe cards with summary nutrition and allergen flags.
   - UI: Inline carousel with filter badges.
2. `solidstart.recipes.featured`
   - Use `/recipes/featured` to provide a discovery entry point.
   - UI: spotlight carousel or grid.
3. `solidstart.recipes.getDetails`
   - Return ingredients, steps, nutrition facts, allergen cautions, related recipes.
   - UI: Fullscreen reader with step navigation and tabs.
4. `solidstart.recipes.toggleBookmark` & `toggleLike`
   - Write tools with confirmation messaging and state feedback.
   - UI: Buttons inside the details component using `window.openai.callTool`.

Deliverables: working MCP server, registered widgets, tested through MCP Inspector and ChatGPT Developer Mode on web/mobile.

## Phase 3 · Experience Enhancements (Day 11‑15)
- Add in-widget filtering/sorting using `openai/widgetAccessible`.
- Implement `checkFoodSafety` (API-backed or curated knowledge fallback).
- Polish UI states, error boundaries, and empty results.
- Wire operational telemetry: latency metrics, error categories, audit logs.

## Phase 4 · Optional Extensions
- **Tracker integration:** expose BabyAgent summaries (`get_baby_summary`, `analyze_patterns`).
- **Personalized plans:** combine tracker + recipes (`generate_personalized_plan`).
- **Knowledge base add-on:** introduce evidence-based articles if later prioritized.

## Ongoing Workstreams
- Security & compliance: OAuth/token handling for write tools, rate limits, privacy policy.
- UX iteration: tester feedback, accessibility, localization, dark mode.
- Launch readiness: directory metadata, starter prompts, documentation for eventual App submission.

## Next Actions
1. Scaffold the TypeScript MCP server and Solid Start API client.
2. Implement and test the four MVP recipe tools.
3. Build Skybridge widgets (carousel + detail view) and verify in ChatGPT.

## Detailed To-Do List

> See `docs/mcp-tool-plan.md` for the comprehensive tool catalog and phased roadmap. The tasks below track engineering execution for Phase 1 and supporting infrastructure.

### Setup & Infrastructure
- [ ] Initialize TypeScript project (`npm init`, `tsconfig`, lint/test tooling).
- [ ] Install dependencies: `@modelcontextprotocol/sdk`, `axios`, `zod`, `dotenv`, `pino`, `react`, `react-dom`, `esbuild`, testing libs.
- [ ] Configure project layout (`src/server`, `src/integrations`, `src/components`, `config`, `scripts`).
- [ ] Build configuration loader with schema validation (env vars, API keys, base URLs).
- [ ] Implement shared logger and request tracing utilities.
- [ ] Create Solid Start API client with axios, interceptors, and typed responses.

### MCP Server Core
- [ ] Implement `src/server/index.ts` to bootstrap `McpServer`, load tools, register resources, and start HTTP server.
- [ ] Add graceful shutdown, error handling, and health check endpoints.
- [ ] Set up developer commands: `npm run dev`, `npm run build`, `npm run start`.
- [ ] Establish unit test scaffolding for tool handlers and integrations.

### Recipe Tools (Phase 2 MVP)
- [ ] Tool: `solidstart.recipes.search`
  - [ ] Define input/output schemas with `zod`.
  - [ ] Call `/recipes` with filters; map response to unified format.
  - [ ] Register tool metadata (descriptions, status text, read-only hint).
- [ ] Tool: `solidstart.recipes.featured`
  - [ ] Implement client call to `/recipes/featured`.
  - [ ] Provide fallback handling when API is empty/unavailable.
- [ ] Tool: `solidstart.recipes.getDetails`
  - [ ] Fetch recipe detail; normalize ingredients, steps, nutrition, allergen info.
  - [ ] Support related recipes or recommended follow-ups.
- [ ] Tools: `solidstart.recipes.toggleBookmark` & `toggleLike`
  - [ ] Implement POST/DELETE flows; ensure idempotency and error messaging.
  - [ ] Add `_meta["openai/toolInvocation/*"]` for status updates.
  - [ ] Respect authentication requirements (token injection, error propagation).

### UI Components (Skybridge)
- [ ] Create React project under `src/components` with build script (esbuild).
- [ ] Component: RecipeCarousel (inline display)
  - [ ] Visualize cards with age/allergen badges and summary.
  - [ ] Support selection to fetch detail tool via `widgetAccessible`.
- [ ] Component: RecipeDetail (fullscreen)
  - [ ] Render ingredients, steps, nutrition, caution notices, related recipes.
  - [ ] Integrate action buttons (like/bookmark) invoking tool calls.
- [ ] Register Skybridge resources in MCP server with proper `_meta` (description, CSP, domain hints).
- [ ] Implement component state hooks (`useWidgetState`, `useOpenAiGlobal`) for responsive layouts.

### Testing & Validation
- [ ] Unit tests for integration clients (mock API responses).
- [ ] Tool handler tests verifying schema validation and error pathways.
- [ ] Manual testing with MCP Inspector (`npx @modelcontextprotocol/inspector`).
- [ ] Connect via ChatGPT Developer Mode (web + mobile) to validate UX and write operations.
- [ ] Record test prompts and outcomes for regression tracking.

### Observability & Operations
- [ ] Instrument logs with request IDs, tool names, latency metrics.
- [ ] Add error categorization (client error vs server error vs upstream).
- [ ] Prepare basic monitoring hooks (e.g., health check endpoint, alerts placeholder).
- [ ] Document runbook for troubleshooting common failures.

### Security & Compliance
- [ ] Implement authentication layer (token/OAuth) for Solid Start APIs if required.
- [ ] Enforce rate limits or retries on API client.
- [ ] Draft privacy policy section covering data usage in MCP context.
- [ ] Ensure write tools have explicit confirmation copy and audit logging.

### Deployment Prep
- [ ] Containerize or prepare deployment scripts (Dockerfile or platform-specific config).
- [ ] Choose hosting (Render/Fly/Cloud Run) with HTTPS support.
- [ ] Set up CI/CD pipeline (lint/test/build on push).
- [ ] Configure environment secrets management.
- [ ] Provide README instructions for setup, testing, deployment, and developer mode linking.
