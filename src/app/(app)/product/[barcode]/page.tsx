import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/product-view";

export const metadata: Metadata = { title: "Health score" };

export default async function ProductPage({ params }: PageProps<"/product/[barcode]">) {
  const { barcode } = await params;
  if (!/^\d{6,14}$/.test(barcode)) notFound();
  return <ProductView code={barcode} />;
}
