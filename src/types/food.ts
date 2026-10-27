// Normalised shapes the app works with. API clients map raw responses into these,
// so components never touch strIngredient7 or nutriments["saturated-fat_100g"].

export type Grade = "a" | "b" | "c" | "d" | "e";

export type Nutr = {
  energy: number | null; // kcal / 100 g
  sugar: number | null;
  salt: number | null;
  satfat: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
};

export type Product = {
  barcode: string;
  name: string | null;
  brand: string | null;
  image: string | null;
  grade: Grade | null;
  nova: 1 | 2 | 3 | 4 | null;
  nutr: Nutr;
  allergens: string[];
  additives: string[];
  categories: string[];
  ingredients: string | null;
  quantity: string | null;
};

export type Swap = { barcode: string; name: string; brand: string | null; image: string | null; grade: Grade };

export type Fruit = {
  name: string;
  family: string;
  genus: string;
  order: string;
  nutr: { calories: number; fat: number; sugar: number; carbs: number; protein: number };
};

export type Ing = { name: string; measure: string; canon: string | null };

export type RecipeCard = {
  src: "spoon" | "mealdb";
  id: string;
  title: string;
  image: string | null;
  used: number;
  missed: number;
  usedNames: string[];
  missedNames: string[];
  // expiring items this recipe would rescue, used for ranking + the badge
  rescues: number;
  area?: string | null;
  category?: string | null;
};

export type Recipe = {
  src: "spoon" | "mealdb";
  id: string;
  title: string;
  image: string | null;
  servings: number | null;
  minutes: number | null;
  area: string | null;
  category: string | null;
  ings: Ing[];
  steps: string[];
  youtube: string | null;
  source: string | null;
  tags: string[];
};

export type DrinkCard = { id: string; name: string; image: string | null; matches: string[]; alcoholic: boolean };

export type Drink = DrinkCard & {
  glass: string | null;
  category: string | null;
  instructions: string;
  ings: { name: string; measure: string }[];
};

export type MealListItem = { id: string; title: string; image: string | null };
