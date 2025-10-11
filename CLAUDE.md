# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dear Baby MCP is a Model Context Protocol (MCP) server that exposes Dear Baby's parenting ecosystem to ChatGPT. The initial release (Phase 1) focuses on Solid Start recipe discovery and interaction, with future phases planned for baby tracking (BabyAgent) and knowledge base integration.

**Core Purpose**: Enable parents to search age-appropriate baby recipes, view details, and interact (like/bookmark) directly from ChatGPT through natural language conversations.

## Development Commands

### Running the Server
```bash
npm run dev       # Development with hot reload (tsx watch)
npm run build     # Compile TypeScript to dist/
npm run start     # Run production build
```

### Testing
- Currently no test suite configured (`npm test` exits with 0)
- Manual testing via MCP Inspector: `npx @modelcontextprotocol/inspector`
- End-to-end testing through ChatGPT Developer Mode (web + mobile)

## Architecture

### Server Bootstrap Flow
1. `src/server/index.ts` initializes `McpServer` from `@modelcontextprotocol/sdk`
2. Creates HTTP transport using `StreamableHTTPServerTransport`
3. Instantiates `SolidStartClient` with base URL and optional API key from config
4. Registers all Solid Start tools via `registerSolidStartTools()`
5. Starts HTTP server listening on configured port (default 8080)

### Key Architectural Layers

**Config Layer** (`src/config/env.ts`)
- Validates environment variables using Zod schemas
- Exports typed `config` object with solidStart API settings, port, log level
- Fails fast on startup if required env vars are missing

**Integration Layer** (`src/integrations/solidstart/client.ts`)
- `SolidStartClient` wraps axios for all Solid Start API calls
- Methods: `listRecipes()`, `getFeaturedRecipes()`, `getRecipeDetails()`, `toggleRecipeInteraction()`
- Handles authentication headers (Bearer token if `apiKey` is provided)
- Wraps axios errors with descriptive messages including HTTP status

**Tool Layer** (`src/server/tools/solidstartRecipes.ts`)
- Registers 5 MCP tools: `search`, `featured`, `getDetails`, `toggleBookmark`, `toggleLike`
- Each tool defines:
  - Zod input schema for validation
  - OpenAI metadata (`_meta`) for status messages during invocation
  - Handler function that calls SolidStartClient and formats response
- `deriveAgeGroupFromMonths()` converts numeric age to stage (STAGE_1 through STAGE_4)
- Client-side allergen filtering applied after API response

**Utility Layer** (`src/server/utils/logger.ts`)
- Pino-based structured logger
- Log level controlled by `LOG_LEVEL` env var (defaults to debug in dev, info in prod)

### Component Layer (Planned)
- `src/components/` will contain React widgets for Skybridge (ChatGPT's iframe runtime)
- Components to be bundled with esbuild
- Will use `window.openai.toolOutput` and `window.openai.callTool` for ChatGPT integration

## Environment Configuration

Required in `.env`:
```
SOLIDSTART_BASE_URL=https://solidstart.onrender.com  # Required
SOLIDSTART_API_KEY=                                   # Optional, for write ops
PORT=8080                                             # Optional, defaults to 8080
LOG_LEVEL=debug                                       # Optional
```

Copy `.env.example` to `.env` before first run.

## API Integration Notes

### Solid Start API
- Full OpenAPI spec available at: `https://solidstart.onrender.com/openapi.json`
- Recipe stages map to baby age:
  - STAGE_1: 4-6 months
  - STAGE_2: 7-8 months
  - STAGE_3: 9-10 months
  - STAGE_4: 11+ months
- Write operations (like, bookmark) require authentication via Bearer token
- Pagination: uses `limit` and `offset` params

### Future Integrations
- MomAI Agent API (Tracker): `https://momaiagent-backend.onrender.com/openapi.json`
- Knowledge Base: Supabase-backed article storage

## MCP Tools Currently Implemented

1. **solidstart.recipes.search**
   - Inputs: `baby_age_months`, `age_group`, `meal_type`, `allergens_to_avoid[]`, `query`, `limit`, `offset`, `lang`
   - Returns paginated recipe list with allergen filtering
   - Read-only

2. **solidstart.recipes.featured**
   - Inputs: `baby_age_months`, `age_group`, `limit`, `lang`
   - Returns curated featured recipes
   - Read-only

3. **solidstart.recipes.getDetails**
   - Inputs: `recipe_id`, `lang`
   - Returns full recipe including ingredients, instructions, nutrition
   - Read-only

4. **solidstart.recipes.toggleBookmark**
   - Inputs: `recipe_id`, `bookmarked` (boolean)
   - Saves/unsaves recipe for user
   - Write operation (requires auth)

5. **solidstart.recipes.toggleLike**
   - Inputs: `recipe_id`, `liked` (boolean)
   - Likes/unlikes recipe
   - Write operation (requires auth)

## Project Structure
```
src/
├── config/
│   └── env.ts                 # Environment config with Zod validation
├── integrations/
│   └── solidstart/
│       └── client.ts          # Axios-based API client
├── server/
│   ├── index.ts               # MCP server bootstrap
│   ├── tools/
│   │   └── solidstartRecipes.ts  # Tool registrations
│   └── utils/
│       └── logger.ts          # Pino logger
└── components/                # Future React widgets (Skybridge)
    └── README.md

docs/
├── mcp-tool-plan.md           # Full phased rollout plan
├── api-summary.md             # API endpoint reference
└── README.md                  # Roadmap and detailed task list

solidstart-openapi.json        # Downloaded OpenAPI spec
momaiagent-openapi.json        # Downloaded OpenAPI spec (future use)
```

## Phased Development Plan

**Current Status**: Phase 1 tools implemented, components not yet built

**Phase 1** (Days 2-10): Solid Start MVP
- ✅ Recipe search, featured, details, bookmark, like tools
- ⏳ React components for carousel and detail view

**Phase 2** (Days 11-15): Experience enhancements
- Food safety checker (`checkFoodSafety`)
- Allergen introduction guide
- Widget-accessible filtering
- Telemetry and error handling polish

**Phase 3** (TBD): Tracker integration
- Tools: `logActivity`, `getSummary`, `analyzePatterns`, `getGrowthInsights`
- Requires MomAI Agent API client implementation

**Phase 4** (TBD): Knowledge base + intelligent assistant
- Tools: `searchArticles`, `getArticleDetails`, `generatePlan`, `quickSearch`
- Requires Supabase integration for knowledgebase

## Authentication Strategy

- Read-only tools work without authentication
- Write tools (`toggleBookmark`, `toggleLike`) require `SOLIDSTART_API_KEY`
- Client sends `Authorization: Bearer <token>` header when `apiKey` is configured
- Future: OAuth flow for user-specific actions

## Common Development Patterns

### Adding a New Tool
1. Define Zod input schema in tool file
2. Register tool with `server.registerTool(name, options, handler)`
3. Set `_meta` for OpenAI status messages
4. Mark read-only tools with `annotations: { readOnlyHint: true }`
5. Call integration client method in handler
6. Return `{ content: [...], structuredContent: {...} }`

### Adding a New Integration
1. Create client class in `src/integrations/<service>/client.ts`
2. Define TypeScript types for API request/response shapes
3. Use axios with error wrapping pattern (see `SolidStartClient.wrapAxiosError`)
4. Pass client to tool registration functions

### Allergen Filtering Logic
- API does not filter allergens server-side
- Client-side filtering in `shouldIncludeRecipe()` function
- Converts allergen names to lowercase for case-insensitive matching
- Returns filtered count in structured response

## Documentation References

- Full tool catalog and phased roadmap: [docs/mcp-tool-plan.md](docs/mcp-tool-plan.md)
- API endpoint mappings: [docs/api-summary.md](docs/api-summary.md)
- Project roadmap and task checklist: [README.md](README.md)
- Skybridge component plans: [src/components/README.md](src/components/README.md)
