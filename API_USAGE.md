# API usage

Every call goes through our server routes (`src/app/api/*`) → a client in `src/lib/apis/*` → `cachedFetch` (Supabase `api_cache` table + in-memory layer + in-flight de-dupe) → `request()` (timeout, 2 retries with jittered exponential backoff on 429/5xx, Zod validation).

| Upstream endpoint | Our client function | Feature | Cache TTL |
|---|---|---|---|
| OFF `GET /api/v2/product/{barcode}?fields=…` | `off.getProduct` | Scan, Health Score card, auto-tick shopping list | 7 days (misses: 1 h) |
| OFF Search-a-licious `GET search.openfoodfacts.org/search?q=categories_tags:… AND nutriscore_grade:(…)` | `off.getSwaps` | Better swaps (up to 3, same category, better grade) | 1 day |
| OFF `GET /api/v2/search` (fallback) | `off.getSwaps` | Same, used when Search-a-licious fails | 1 day |
| Fruityvice `GET /api/fruit/all` | `fruityvice.listFruits` | "Add fresh fruit" autocomplete | 7 days |
| Fruityvice `GET /api/fruit/{name}` | `fruityvice.getFruit` | Fruit card, real-fruit sugar comparison | 7 days |
| Spoonacular `GET /recipes/findByIngredients` (ranking=1, ignorePantry=true, number=10) | `spoonacular.findByIngredients` | Recipes → Use it up, Home | 24 h |
| Spoonacular `GET /recipes/{id}/information` | `spoonacular.recipeInfo` | Recipe detail + cook mode | 24 h |
| Spoonacular `POST /recipes/parseIngredients` | `spoonacular.estimateCost` | Shopping list ₹ estimate | 24 h |
| TheMealDB `filter.php?i=` | `mealdb.byIngredient` | Use it up fallback (quota guard) | 7 days |
| TheMealDB `filter.php?a=`, `filter.php?c=`, `search.php?s=` | `mealdb.byArea / byCategory / search` | Recipes → Explore | 7 days |
| TheMealDB `lookup.php?i=` | `mealdb.lookup` | Recipe detail, cook mode (YouTube), fallback scoring | 7 days |
| TheMealDB `random.php` | `mealdb.random` | Explore → Surprise me | not cached |
| TheMealDB `list.php?a=list`, `categories.php` | `mealdb.areas / categories` | Explore filters | 7 days |
| TheCocktailDB `filter.php?a=Non_Alcoholic` | `cocktaildb.nonAlcoholic` | Drinks (default, non-alcoholic catalogue) | 7 days |
| TheCocktailDB `filter.php?i=` | `cocktaildb.byIngredient` | Drinks from leftovers | 7 days |
| TheCocktailDB `lookup.php?i=` | `cocktaildb.lookupDrink` | Drink matching + detail sheet | 7 days |

## Spoonacular quota guard

Costs (from the docs, Oct 2026): `findByIngredients` = 1 + 0.01 per result, `information` = 1, `parseIngredients` = 1 per ingredient line. We check `quota_log` before each call and record the real cost from the `X-API-Quota-Request` response header (falling back to the estimate). The limit is `SPOON_DAILY_POINTS` (default 45) per UTC day. When the next call would cross it:

- **Use it up** → silently switches to TheMealDB (searches by each expiring ingredient, ranks by pantry matches) and shows "Showing more ideas".
- **Shopping cost** → uses a built-in table of typical Indian prices, still labelled "estimate".
- **Spoonacular recipe detail** → friendly 429 suggesting an Explore recipe instead.
