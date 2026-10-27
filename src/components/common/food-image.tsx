"use client";

import { Apple, ChefHat, CupSoda, Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const icons = { product: Package, fruit: Apple, recipe: ChefHat, drink: CupSoda };

// API images are hit and miss - fall back to a calm icon tile instead of a broken image
export function FoodImage({
  src,
  alt,
  kind = "product",
  className,
  sizes = "96px",
  priority,
  contain,
}: {
  src: string | null | undefined;
  alt: string;
  kind?: keyof typeof icons;
  className?: string;
  sizes?: string;
  priority?: boolean;
  contain?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const Icon = icons[kind];
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src && !broken ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={contain ? "object-contain p-2" : "object-cover"} onError={() => setBroken(true)} />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground" role="img" aria-label={alt}>
          <Icon className="size-1/3 min-h-5 min-w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
