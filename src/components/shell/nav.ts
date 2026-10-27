import { BarChart3, ChefHat, CupSoda, Home, LayoutGrid, Refrigerator, ScanLine, Settings, ShoppingBasket, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

export const TABS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/pantry", label: "Pantry", icon: Refrigerator },
  { href: "/scan", label: "Scan", icon: ScanLine, match: ["/scan", "/product", "/fruit"] },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/more", label: "More", icon: LayoutGrid, match: ["/more", "/drinks", "/shop", "/insights", "/settings"] },
];

export const SIDE: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine, match: ["/scan", "/product", "/fruit"] },
  { href: "/pantry", label: "Pantry", icon: Refrigerator },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/drinks", label: "Drinks", icon: CupSoda },
  { href: "/shop", label: "Shopping list", icon: ShoppingBasket },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(item: NavItem, path: string) {
  return (item.match ?? [item.href]).some((m) => path === m || path.startsWith(`${m}/`));
}
