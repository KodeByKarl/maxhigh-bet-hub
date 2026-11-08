import { cspNonce } from "@/lib/csp-nonce";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "@/lib/auth";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    ssr: { nonce: cspNonce() },
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Wrap sits above shellComponent + route CatchBoundary so useAuth/useQuery
    // always see a provider (including during error remounts / hydration).
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    ),
  });

  return router;
};
