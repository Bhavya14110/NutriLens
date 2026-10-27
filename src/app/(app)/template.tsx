"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// template remounts per navigation, which gives us a cheap page transition
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
