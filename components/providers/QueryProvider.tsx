"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Una instancia por pestaña en el browser (en el servidor, una por request:
// nunca compartir cache entre usuarios).
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Volver a una pantalla muestra al instante lo ultimo que se vio; si
        // tiene mas de 30 s se refresca en segundo plano.
        staleTime: 30 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
