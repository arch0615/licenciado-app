import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AlertTriangle, Inbox, Wrench } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { userMessage } from "@/services/api/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

type Action = { label: string; onPress: () => void };

/** Empty states are always actionable (docs/mobile-design-system.md §5.7). */
export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action: Action; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      {icon ?? <Inbox size={40} color={colors.primary} />}
      <AppText variant="title3" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      <Button label={action.label} onPress={action.onPress} />
    </View>
  );
}

/** Inline error with a mandatory retry — the web app never offered one. */
export function ErrorState({ title = "Não foi possível carregar", error, onRetry }: { title?: string; error?: unknown; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <Card variant="alert" tone="danger">
      <View style={styles.row}>
        <AlertTriangle size={20} color={colors.danger} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="callout" tone="muted">
            {error ? userMessage(error) : "Tente novamente em instantes."}
          </AppText>
        </View>
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Button label="Tentar novamente" variant="outline" onPress={onRetry} />
      </View>
    </Card>
  );
}

export function LoadingState({ lines = 3 }: { lines?: number }) {
  return (
    <View accessibilityLabel="Carregando" accessibilityRole="progressbar" style={{ gap: spacing.sm }}>
      {Array.from({ length: lines }, (_, index) => (
        <Card key={index}>
          <View style={{ gap: spacing.xs }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="90%" />
            <Skeleton width="40%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

/**
 * Placeholder for screens not built yet. Points to the spec so the next developer knows
 * exactly what to implement (screen IDs from licenciado-web/docs/mobile-screen-inventory.md).
 */
export function ScreenPlaceholder({ title, specId, description }: { title: string; specId: string; description: string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.row}>
        <Wrench size={20} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <AppText variant="overline" tone="muted">
            Em construção · {specId}
          </AppText>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="callout" tone="muted">
            {description}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  flex: { flex: 1, gap: 2 }
});
