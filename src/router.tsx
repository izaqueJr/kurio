import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import App from "./App";
import {
  CartPage,
  CheckoutPage,
  NftPage,
  OrderPage,
  ProfilePage,
  WalletsPage,
} from "./screens";
import { subscribeRealtime } from "./realtime";
import { AuthModalProvider } from "./components/auth-modal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
function RealtimeBridge() {
  const client = useQueryClient();
  useEffect(() => subscribeRealtime(client), [client]);
  return (
    <AuthModalProvider>
      <Outlet />
    </AuthModalProvider>
  );
}
const rootRoute = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
    </QueryClientProvider>
  ),
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    network: z.enum(["Ethereum", "Polygon", "Solana"]).optional(),
    sort: z.enum(["recent", "price-asc", "price-desc"]).optional(),
    tab: z.enum(["all", "new", "trending"]).optional(),
    min: z.coerce.number().min(0).optional(),
    max: z.coerce.number().min(0).optional(),
    page: z.coerce.number().int().min(1).optional(),
  }),
  component: App,
});
const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$nftId",
  component: NftPage,
});
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: CartPage,
});
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: CheckoutPage,
});
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order/$orderId",
  component: OrderPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/perfil",
  component: ProfilePage,
});
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carteiras",
  component: WalletsPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  profileRoute,
  walletsRoute,
]);
export const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
