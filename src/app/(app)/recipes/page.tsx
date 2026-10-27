import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGridSkeleton, RecipesScreen } from "@/components/recipes/recipes-screen";

export const metadata: Metadata = { title: "Recipes" };

export default function RecipesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <RecipesScreen />
    </Suspense>
  );
}
