import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  createTicket,
  getWhatsappSupportNumber,
  getTicket,
  listTicketMessages,
  listTickets,
  resolveTicket,
  sendTicketMessage,
  type TicketCategory,
  type TicketFilters
} from "./support.service";

export function useTickets(filters: TicketFilters = {}) {
  const uid = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.user(uid, "support", "tickets", filters),
    queryFn: ({ pageParam }) => listTickets(api, filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined)
  });
}

export function useTicket(id: string) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "support", "ticket", id), queryFn: () => getTicket(api, id) });
}

/** Messages refresh every 30 s while the conversation is open (the backend has no push for replies). */
export function useTicketMessages(id: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "support", "messages", id),
    queryFn: () => listTicketMessages(api, id),
    refetchInterval: 30_000
  });
}

export function useCreateTicket() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  const key = useRef(newIdempotencyKey("ticket"));
  return useMutation({
    mutationFn: (input: { category: TicketCategory; subject?: string; initialMessage?: string; clientId?: string }) =>
      createTicket(api, input, key.current),
    onSuccess: async () => {
      key.current = newIdempotencyKey("ticket");
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "support") });
    }
  });
}

export function useSendTicketMessage(ticketId: string) {
  const uid = useUserId();
  const queryClient = useQueryClient();
  const key = useRef(newIdempotencyKey("msg"));
  return useMutation({
    mutationFn: (text: string) => sendTicketMessage(api, ticketId, text, key.current),
    onSuccess: async () => {
      key.current = newIdempotencyKey("msg");
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "support") });
    }
  });
}

export function useResolveTicket(ticketId: string) {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resolveTicket(api, ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "support") })
  });
}

/** WhatsApp support number; `null` = not configured (the UI hides the button). */
export function useWhatsappSupport() {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "support", "whatsapp"),
    queryFn: () => getWhatsappSupportNumber(api),
    staleTime: 10 * 60_000
  });
}
