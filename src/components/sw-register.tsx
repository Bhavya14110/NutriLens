"use client";

import { useEffect } from "react";

// register in prod only - a dev sw caching hot chunks makes for a very confusing afternoon
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => console.warn("sw register failed", err));
  }, []);
  return null;
}
