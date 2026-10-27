"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemes } from "next-themes";
import type { ComponentProps } from "react";

// MotionConfig "user" = framer honours prefers-reduced-motion everywhere for free
export function ThemeProvider(props: ComponentProps<typeof NextThemes>) {
  return (
    <MotionConfig reducedMotion="user">
      <NextThemes {...props} />
    </MotionConfig>
  );
}
