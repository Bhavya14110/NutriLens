"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/fetcher";
import type { DrinksRes, HomeData, InsightsRes, MeRes, NewPantry, PantryView, ProductRes, RecipeRes, ShopRes, SwapsRes, UseItUpRes } from "@/types/api";
import type { Loc } from "@/types/db";
import type { Drink, Fruit, MealListItem } from "@/types/food";

export const qk = {
  home: ["home"] as const,
  pantry: ["pantry"] as const,
  shop: ["shop"] as const,
  me: ["me"] as const,
  useitup: ["useitup"] as const,
  drinks: ["drinks"] as const,
  insights: ["insights"] as const,
};

export const useHome = () => useQuery({ queryKey: qk.home, queryFn: () => api<HomeData>("/api/home") });
export const usePantry = () => useQuery({ queryKey: qk.pantry, queryFn: () => api<{ items: PantryView[] }>("/api/pantry").then((r) => r.items) });
export const useShop = () => useQuery({ queryKey: qk.shop, queryFn: () => api<ShopRes>("/api/shop") });
export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api<MeRes>("/api/me") });
export const useInsights = () => useQuery({ queryKey: qk.insights, queryFn: () => api<InsightsRes>("/api/insights") });

// recipe lookups hit external APIs - keep them warm for a while
export const useUseItUp = () => useQuery({ queryKey: qk.useitup, queryFn: () => api<UseItUpRes>("/api/recipes/useitup"), staleTime: 5 * 60_000 });
export const useDrinks = () => useQuery({ queryKey: qk.drinks, queryFn: () => api<DrinksRes>("/api/drinks"), staleTime: 10 * 60_000 });

export const useProduct = (code: string) =>
  useQuery({ queryKey: ["product", code], queryFn: () => api<ProductRes>(`/api/product/${code}`), staleTime: 10 * 60_000 });
export const useSwaps = (code: string, enabled: boolean) =>
  useQuery({ queryKey: ["swaps", code], queryFn: () => api<SwapsRes>(`/api/swaps/${code}`), enabled, staleTime: 60 * 60_000 });
export const useFruit = (name: string) =>
  useQuery({ queryKey: ["fruit", name], queryFn: () => api<{ fruit: Fruit; canon: string | null; shelf: number }>(`/api/fruit/${encodeURIComponent(name)}`), staleTime: 60 * 60_000 });
export const useRecipe = (src: string, id: string) =>
  useQuery({ queryKey: ["recipe", src, id], queryFn: () => api<RecipeRes>(`/api/recipes/${src}/${id}`), staleTime: 10 * 60_000 });
export const useDrink = (id: string | null) =>
  useQuery({ queryKey: ["drink", id], queryFn: () => api<{ drink: Drink }>(`/api/drinks/${id}`), enabled: Boolean(id), staleTime: 60 * 60_000 });
export const useExplore = (qs: string | null) =>
  useQuery({ queryKey: ["explore", qs], queryFn: () => api<{ items: MealListItem[] }>(`/api/recipes/explore?${qs}`), enabled: Boolean(qs), staleTime: 60 * 60_000 });

// anything that changes the pantry ripples into home, recipes and drinks
function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: (keyof typeof qk)[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: qk[k] })));
}

const pantryKeys = ["pantry", "home", "useitup", "drinks", "insights"] as const;

export function useAddPantry() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (p: NewPantry) => api<{ id: string }>("/api/pantry", { method: "POST", json: p }),
    onSuccess: () => inv(...pantryKeys),
    onError: (e) => toast.error(e.message),
  });
}

export type PantryPatch = Partial<{ status: "active" | "used" | "wasted"; useQty: number; qty: number; unit: string; expires_at: string | null; location: Loc; name: string; canon_ing: string | null }>;

export function usePatchPantry() {
  const qc = useQueryClient();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PantryPatch }) => api<{ status: string; qty: number }>(`/api/pantry/${id}`, { method: "PATCH", json: patch }),
    // optimistic: the row reacts instantly, the server catches up
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.pantry });
      const prev = qc.getQueryData<PantryView[]>(qk.pantry);
      if (prev) {
        qc.setQueryData<PantryView[]>(
          qk.pantry,
          patch.status && patch.status !== "active"
            ? prev.filter((p) => p.id !== id)
            : prev.map((p) => (p.id === id ? { ...p, ...patch, qty: patch.useQty ? Math.max(0, p.qty - patch.useQty) : (patch.qty ?? p.qty) } : p)),
        );
      }
      return { prev };
    },
    onError: (e, _v, c) => {
      if (c?.prev) qc.setQueryData(qk.pantry, c.prev);
      toast.error(e.message);
    },
    onSettled: () => inv(...pantryKeys),
  });
}

export function useAddShop() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (items: { name: string; canon_ing?: string | null; qty?: number; unit?: string }[]) => api("/api/shop", { method: "POST", json: { items } }),
    onSuccess: () => inv("shop"),
    onError: (e) => toast.error(e.message),
  });
}

export function useTickShop() {
  const qc = useQueryClient();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: { ids: string[]; done: boolean }) => api<{ added: number }>("/api/shop/tick", { method: "POST", json: v }),
    onMutate: async ({ ids, done }) => {
      await qc.cancelQueries({ queryKey: qk.shop });
      const prev = qc.getQueryData<ShopRes>(qk.shop);
      if (prev) qc.setQueryData<ShopRes>(qk.shop, { ...prev, items: prev.items.map((i) => (i.ids.some((x) => ids.includes(x)) ? { ...i, done } : i)) });
      return { prev };
    },
    onError: (e, _v, c) => {
      if (c?.prev) qc.setQueryData(qk.shop, c.prev);
      toast.error(e.message);
    },
    onSettled: () => inv("shop", ...pantryKeys),
  });
}

export function useRemoveShop() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (ids: string[]) => api("/api/shop", { method: "DELETE", json: { ids } }),
    onSuccess: () => inv("shop"),
    onError: (e) => toast.error(e.message),
  });
}
