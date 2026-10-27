import type { Metadata } from "next";
import { DrinksScreen } from "@/components/drinks/drinks-screen";

export const metadata: Metadata = { title: "Drinks" };

export default function DrinksPage() {
  return <DrinksScreen />;
}
