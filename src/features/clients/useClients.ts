import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getClient,
  getClientJourney,
  listClients,
  listJourneyCards,
  listPendingActions,
  type JourneyFilters
} from "./client.service";
import type { ClientFilters } from "./types";

export function useClients(filters: ClientFilters) {
  const uid = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.user(uid, "clients", "list", filters),
    queryFn: ({ pageParam }) => listClients(api, filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData
  });
}

export function useClient(clientId: string) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "clients", "detail", clientId), queryFn: () => getClient(api, clientId) });
}

export function useClientJourney(clientId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "clients", "journey", clientId),
    queryFn: () => getClientJourney(api, clientId)
  });
}

export function useJourneyBoard(filters: JourneyFilters) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "clients", "journey-board", filters),
    queryFn: () => listJourneyCards(api, filters),
    placeholderData: keepPreviousData
  });
}

export function usePendingActions() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "clients", "pending-actions"), queryFn: () => listPendingActions(api) });
}

