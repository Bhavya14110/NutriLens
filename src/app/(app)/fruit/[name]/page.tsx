import type { Metadata } from "next";
import { FruitView } from "@/components/fruit/fruit-view";

export const metadata: Metadata = { title: "Fresh fruit" };

export default async function FruitPage({ params }: PageProps<"/fruit/[name]">) {
  const { name } = await params;
  return <FruitView name={decodeURIComponent(name)} />;
}
