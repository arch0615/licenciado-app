import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getCommission,
  getCommissionSummary,
  getPaymentReceipt,
  getPaymentStatement,
  listCommissions,
  listPayments
} from "./commission.service";
import type { CommissionFilters } from "./types";

export function useCommissionSummary() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "commissions", "summary"), queryFn: () => getCommissionSummary(api) });
}

export function useCommissions(filters: CommissionFilters) {
  const uid = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.user(uid, "commissions", "list", filters),
    queryFn: ({ pageParam }) => listCommissions(api, filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData
  });
}

export function useCommission(id: string) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "commissions", "detail", id), queryFn: () => getCommission(api, id) });
}

/** Payments are licenciado-only: not even requested without `payments:read`. */
export function usePayments() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  return useInfiniteQuery({
    queryKey: queryKeys.user(uid, "payments", "list"),
    queryFn: ({ pageParam }) => listPayments(api, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: hasPermission(me, "payments:read")
  });
}

export function usePaymentStatement(paymentId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "payments", "statement", paymentId),
    queryFn: () => getPaymentStatement(api, paymentId)
  });
}

/** Loads the textual receipt on demand (GET only). */
export function usePaymentReceipt() {
  return useMutation({ mutationFn: (paymentId: string) => getPaymentReceipt(api, paymentId) });
}
