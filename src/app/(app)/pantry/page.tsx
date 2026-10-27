import type { Metadata } from "next";
import { PantryScreen } from "@/components/pantry/pantry-view";

export const metadata: Metadata = { title: "Pantry" };

export default function PantryPage() {
  return <PantryScreen />;
}
