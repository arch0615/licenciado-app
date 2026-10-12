import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { cancelOrder, getMarketplaceContext, listOrders, listProducts, placeOrder } from "./marketplace.service";

/** Server-controlled: permission AND the feature flag from /v1/auth/me. */
export function useMarketplaceEnabled(): boolean {
  const { me } = useAuthenticatedContext();
  return hasPermission(me, "marketplace:use") && me.features?.marketplace === true;
}

export function useMarketplaceContext() {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "marketplace", "context"),
    queryFn: () => getMarketplaceContext(api),
    enabled: useMarketplaceEnabled()
  });
}

export function useProducts(search: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "marketplace", "products", search),
    queryFn: () => listProducts(api, search),
    enabled: useMarketplaceEnabled(),
    placeholderData: keepPreviousData
  });
}

export function useOrders() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "marketplace", "orders"), queryFn: () => listOrders(api), enabled: useMarketplaceEnabled() });
}



export function usePlaceOrder() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  const key = useRef(newIdempotencyKey("order"));
  return useMutation({
    mutationFn: (productId: string) => placeOrder(api, productId, key.current),
    onSuccess: async () => {
      key.current = newIdempotencyKey("order");
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "marketplace") });
    }
  });
}

export function useCancelOrder() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(api, orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "marketplace") })
  });
}
