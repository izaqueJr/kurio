import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import App from "./App";
import { NotFoundPage } from "./pages/not-found";
import type { Network } from "./domain";
import { subscribeRealtime } from "./realtime";
import { AuthModalProvider } from "./components/auth-modal";
import { LiveAnnouncer } from "./components/layout";
import { ApiError, onSessionExpired, toApiError } from "./api/client";
import { endSession, sessionQuery } from "./api/queries";
import { consumeSessionExpired } from "./api/session-storage";
import { announce } from "./lib/announcer";

/**
 * Política de cache (detalhada em ARCHITECTURE.md):
 * - consultas ficam frescas por 15 s; o tempo real e as mutations invalidam o que mudou;
 * - apenas falhas transitórias (rede, timeout, 5xx) são repetidas, no máximo 2 vezes;
 * - mutations nunca são repetidas automaticamente, exceto a criação de pedido (idempotente).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => toApiError(error).retryable && count < 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3_000),
    },
    mutations: { retry: false },
  },
});

function SessionExpiryWatcher() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const locationRef = useRef(location);
  locationRef.current = location;
  useEffect(() => {
    let handling = false;
    return onSessionExpired(() => {
      if (handling) return;
      handling = true;
      const current = locationRef.current;
      void endSession(client, { remote: false }).then(() => {
        announce("Sua sessão expirou. Entre novamente para continuar.", "assertive");
        const target = current.pathname === "/login" ? undefined : current.href;
        void navigate({ to: "/login", search: { redirect: target, reason: "expired" }, replace: true }).finally(() => {
          handling = false;
        });
      });
    });
  }, [client, navigate]);
  return null;
}

function RealtimeBridge() {
  const client = useQueryClient();
  useEffect(() => subscribeRealtime(client), [client]);
  return null;
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthModalProvider>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <RealtimeBridge />
        <SessionExpiryWatcher />
        <Outlet />
        <LiveAnnouncer />
      </AuthModalProvider>
    </QueryClientProvider>
  );
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

/** Protege fluxos privados no roteador: sem sessão válida, redireciona preservando o destino. */
async function requireSession({ context, location }: { context: { queryClient: QueryClient }; location: { href: string } }) {
  let user = null;
  try {
    user = await context.queryClient.ensureQueryData(sessionQuery);
  } catch (error) {
    if (!(error instanceof ApiError) || !error.retryable) throw error;
  }
  if (!user) throw redirect({ to: "/login", search: { redirect: location.href, reason: consumeSessionExpired() ? "expired" : "required" } });
}

/** Validação dos search params: valores desconhecidos ou inválidos são descartados (não quebram a rota). */
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);
const oneOf = <T extends string>(options: readonly T[]) => (value: unknown) => (options.includes(value as T) ? (value as T) : undefined);
const positive = (value: unknown, { integer = false, min = 0 } = {}) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= min && (!integer || Number.isInteger(parsed)) ? parsed : undefined;
};
const authSearch = (search: Record<string, unknown>): { redirect?: string; reason?: "expired" | "required" } => ({
  redirect: text(search.redirect),
  reason: oneOf(["expired", "required"] as const)(search.reason),
});
export type CatalogSearch = {
  q?: string;
  category?: string;
  network?: Network;
  sort?: "recent" | "price-asc" | "price-desc";
  tab?: "all" | "new" | "trending";
  min?: number;
  max?: number;
  page?: number;
};
const catalogSearch = (search: Record<string, unknown>): CatalogSearch => ({
  q: text(search.q),
  category: text(search.category),
  network: oneOf(["Ethereum", "Polygon", "Solana"] as const)(search.network),
  sort: oneOf(["recent", "price-asc", "price-desc"] as const)(search.sort),
  tab: oneOf(["all", "new", "trending"] as const)(search.tab),
  min: positive(search.min),
  max: positive(search.max),
  page: positive(search.page, { integer: true, min: 1 }),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: catalogSearch,
  component: App,
});
// Telas carregadas sob demanda (code splitting por rota).
const NftPage = lazyRouteComponent(() => import("./pages/nft"), "NftPage");
const CartPage = lazyRouteComponent(() => import("./pages/cart"), "CartPage");
const CheckoutPage = lazyRouteComponent(() => import("./pages/checkout"), "CheckoutPage");
const OrderPage = lazyRouteComponent(() => import("./pages/order"), "OrderPage");
const ProfilePage = lazyRouteComponent(() => import("./pages/account"), "ProfilePage");
const WalletsPage = lazyRouteComponent(() => import("./pages/account"), "WalletsPage");
const FavoritesPage = lazyRouteComponent(() => import("./pages/favorites"), "FavoritesPage");
const AuthPage = lazyRouteComponent(() => import("./pages/auth"), "AuthPage");

const nftRoute = createRoute({ getParentRoute: () => rootRoute, path: "/nft/$nftId", component: NftPage });
const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: "/cart", component: CartPage });
const checkoutRoute = createRoute({ getParentRoute: () => rootRoute, path: "/checkout", beforeLoad: requireSession, component: CheckoutPage });
const orderRoute = createRoute({ getParentRoute: () => rootRoute, path: "/order/$orderId", beforeLoad: requireSession, component: OrderPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: "/perfil", beforeLoad: requireSession, component: ProfilePage });
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carteiras",
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: text(search.redirect) }),
  beforeLoad: requireSession,
  component: WalletsPage,
});
const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/favoritos", beforeLoad: requireSession, component: FavoritesPage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", validateSearch: authSearch, component: () => <AuthPage mode="login" /> });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/cadastro", validateSearch: authSearch, component: () => <AuthPage mode="register" /> });

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
  loginRoute,
  registerRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
