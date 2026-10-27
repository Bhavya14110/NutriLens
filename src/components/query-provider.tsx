"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";
import { HttpError } from "@/lib/fetcher";

const WEEK = 7 * 86400 * 1000;
// only these survive a reload/offline start; recipes etc. are cheap to refetch
const PERSIST = new Set(["pantry", "home", "shop", "me"]);

export function QueryProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: WEEK,
            // show cached data straight away when offline instead of a spinner
            networkMode: "offlineFirst",
            retry: (n, err) => !(err instanceof HttpError && err.status >= 400 && err.status < 500) && n < 2,
            refetchOnWindowFocus: true,
          },
          mutations: { networkMode: "offlineFirst" },
        },
      }),
  );
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      // per-user key so a shared phone never shows the last person's pantry
      key: `nutrilens-cache-${uid}`,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: WEEK,
        buster: "v1",
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && PERSIST.has(String(q.queryKey[0])) },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
