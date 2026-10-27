import type { Metadata } from "next";
import { Suspense } from "react";
import { PantryScreen } from "@/components/pantry/pantry-view";

export const metadata: Metadata = { title: "Pantry" };

export default function PantryPage() {
  // useSearchParams (for ?filter=) needs a Suspense boundary
  return (
    <Suspense>
      <PantryScreen />
    </Suspense>
  );
}
