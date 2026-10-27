import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/recipes/recipe-detail";

export const metadata: Metadata = { title: "Recipe" };

export default async function RecipePage({ params }: PageProps<"/recipes/[src]/[id]">) {
  const { src, id } = await params;
  if ((src !== "spoon" && src !== "mealdb") || !/^\d{1,9}$/.test(id)) notFound();
  return <RecipeDetail src={src} id={id} />;
}
