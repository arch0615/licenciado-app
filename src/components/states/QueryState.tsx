import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Lock } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { isApiError } from "@/services/api/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

import { ErrorState, LoadingState } from "./States";

/** 403 from the backend: explain, never retry (the backend is the authority on permissions). */
export function PermissionState({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <Card variant="alert" tone="warning">
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
        <Lock size={20} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">Acesso não permitido</AppText>
          <AppText variant="callout" tone="muted">
            {message ?? "Você não tem permissão para ver este conteúdo."}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

type Props<T> = {
  query: UseQueryResult<T>;
  /** Rendered when data is present and `isEmpty(data)` is true. */
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  loadingLines?: number;
  errorTitle?: string;
  children: (data: T) => ReactNode;
};

/**
 * Standard loading / error / permission / empty handling for one query.
 * - cached data stays visible while offline or refetching (the OfflineBanner explains it);
 * - 403 → PermissionState (no retry); other errors → ErrorState with retry.
 */
export function QueryState<T>({ query, empty, isEmpty, loadingLines, errorTitle, children }: Props<T>) {
  if (query.data !== undefined) {
    if (empty && isEmpty?.(query.data)) return <>{empty}</>;
    return <>{children(query.data)}</>;
  }
  if (query.error) {
    if (isApiError(query.error) && query.error.isForbidden) return <PermissionState message={query.error.message} />;
    return <ErrorState title={errorTitle} error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <LoadingState lines={loadingLines} />;
}
