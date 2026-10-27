import type { Metadata } from "next";
import { ShopScreen } from "@/components/shop/shop-screen";

export const metadata: Metadata = { title: "Shopping list" };

export default function ShopPage() {
  return <ShopScreen />;
}
