# API Summary for Dear Baby MCP

## Solid Start API (https://solidstart.onrender.com)

### Recipe Endpoints

#### 1. Get Recipes
- **Endpoint**: `GET /recipes`
- **Query Parameters**:
  - `age_group` - Filter by baby age
  - `food_type` - Filter by food category
  - `search_query` - Text search
  - `is_featured` - Boolean flag
  - `limit` - Pagination limit
  - `offset` - Pagination offset
  - `lang` - Language preference
- **Response**: Paginated list of recipes

#### 2. Get Recipe Details
- **Endpoint**: `GET /recipes/{recipe_id}`
- **Parameters**:
  - `recipe_id` (path) - Recipe identifier
  - `lang` (query) - Language preference
- **Response**: Detailed Recipe object

#### 3. Get Featured Recipes
- **Endpoint**: `GET /recipes/featured`
- **Query Parameters**:
  - `age_group` - Filter by baby age
  - `limit` - Number of results
  - `lang` - Language preference
- **Response**: Array of featured Recipe objects

#### 4. Search Recipes
- **Endpoint**: `GET /search/recipes`
- **Query Parameters**:
  - `q` - Keyword search
  - `age_group` - Filter by age
  - `food_type` - Filter by food type
  - `limit` - Results limit
  - `offset` - Pagination offset
- **Response**: Paginated search results

### Interaction Endpoints (Require Authorization)

#### 5. Like Recipe
- **Endpoint**: `POST /recipes/{recipe_id}/like` (to like)
- **Endpoint**: `DELETE /recipes/{recipe_id}/like` (to unlike)
- **Auth**: Required

#### 6. Bookmark Recipe
- **Endpoint**: `POST /recipes/{recipe_id}/bookmark` (to bookmark)
- **Endpoint**: `DELETE /recipes/{recipe_id}/bookmark` (to unbookmark)
- **Auth**: Required

### User Collection Endpoints (Require Authorization)

#### 7. Get Bookmarked Recipes
- **Endpoint**: `GET /users/bookmarks/recipes`
- **Query Parameters**: `lang`
- **Auth**: Required

#### 8. Get Liked Recipes
- **Endpoint**: `GET /users/likes/recipes`
- **Query Parameters**: `lang`
- **Auth**: Required

---

## MomAI Agent API (https://momaiagent-backend.onrender.com)

### Baby Log Endpoints

#### 1. Create Baby Log
- **Endpoint**: `POST /baby_logs`
- **Request Body**: `BabyLogCreate`
  - `baby_id` (required)
  - `log_type` (required) - feeding, diaper, sleep, cry, bowel, etc.
  - `log_data` (required) - Type-specific data object
  - `logged_at` (required) - Timestamp
- **Response**: Created log entry

#### 2. Get Baby Logs
- **Endpoint**: `GET /baby_logs`
- **Query Parameters**:
  - `baby_id` (required)
  - `log_type` (optional) - Filter by activity type
  - `start_date` (optional) - Date range start
  - `end_date` (optional) - Date range end
- **Response**: Array of baby logs

### Summary & Analysis Endpoints

#### 3. Get Baby Summary
- **Endpoint**: `GET /api/baby/summary`
- **Query Parameters**: `baby_id`
- **Response**: `BabyAnalysisResponse`
  - Summary statistics
  - Next recommended action

#### 4. Get Weekly Baby Summary
- **Endpoint**: `GET /api/baby/summary/week`
- **Query Parameters**: `baby_id`
- **Response**: Weekly aggregated data

#### 5. Get Baby Daily Health
- **Endpoint**: `GET /api/baby/health/daily`
- **Query Parameters**: `baby_id`
- **Response**: Daily health metrics

### Health Prediction Endpoints

#### 6. Create Health Prediction
- **Endpoint**: `POST /health_predictions`
- **Request Body**: Health prediction data
- **Response**: Prediction results

### Emotion Tracking Endpoints

#### 7. Get Today's Emotion
- **Endpoint**: `GET /api/emotion/today`
- **Query Parameters**: `baby_id`

#### 8. Get Emotion Card
- **Endpoint**: `GET /api/emotion/card`
- **Query Parameters**: `baby_id`

#### 9. Get Emotion Trend
- **Endpoint**: `GET /api/emotion/trend`
- **Query Parameters**: `baby_id`, date range

#### 10. Get Emotion Milestone
- **Endpoint**: `GET /api/emotion/milestone`
- **Query Parameters**: `baby_id`

---

## MCP Tool Mapping

### Phase 1 (Solid Start Focus)
- `solidstart.recipes.search` → `GET /recipes` or `GET /search/recipes`
- `solidstart.recipes.featured` → `GET /recipes/featured`
- `solidstart.recipes.getDetails` → `GET /recipes/{recipe_id}`
- `solidstart.recipes.toggleBookmark` → `POST/DELETE /recipes/{recipe_id}/bookmark`
- `solidstart.recipes.toggleLike` → `POST/DELETE /recipes/{recipe_id}/like`

### Phase 3 (Tracker Integration)
- `tracker.logActivity` → `POST /baby_logs`
- `tracker.getSummary` → `GET /api/baby/summary` or `GET /api/baby/summary/week`
- `tracker.getGrowthInsights` → `GET /api/baby/health/daily`
- `tracker.analyzePatterns` → Combination of emotion and health endpoints

---

## Authentication Notes

**Solid Start API**:
- Write operations (like, bookmark) require authorization
- User collection endpoints require authorization

**MomAI Agent API**:
- Most endpoints require baby_id as identifier
- Check authentication requirements in full OpenAPI spec

## Next Steps

1. Download full OpenAPI specs for schema details
2. Implement API clients with proper error handling
3. Set up authentication flow for write operations
4. Test endpoints with real data
