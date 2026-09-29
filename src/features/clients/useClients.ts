import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  createClient,
  getClient,
  getClientJourney,
  listClients,
  listJourneyCards,
  listPendingActions
} from "./client.service";
import type { ClientFilters, CreateClientInput } from "./types";

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

export function useJourneyBoard(query: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "clients", "journey-board", query),
    queryFn: () => listJourneyCards(api, query),
    placeholderData: keepPreviousData
  });
}

export function usePendingActions() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "clients", "pending-actions"), queryFn: () => listPendingActions(api) });
}

export function useCreateClient() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  // Same key for retries of the same form submission; a new one after success.
  const key = useRef(newIdempotencyKey("client"));
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(api, input, key.current),
    onSuccess: async () => {
      key.current = newIdempotencyKey("client");
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "clients") });
    }
  });
}
