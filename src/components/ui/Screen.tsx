import type { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { OfflineBanner } from "@/components/states/OfflineBanner";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

type ScreenProps = PropsWithChildren<{
  /** Scrollable content (default). Use `false` for screens that host their own list (FlashList). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Safe-area edges. Tab screens usually omit "bottom" (the tab bar handles it). */
  edges?: Edge[];
  padded?: boolean;
  footer?: ReactNode;
}>;

/** Screen container: themed background, safe area, offline banner, optional pull-to-refresh. */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ["top", "left", "right"],
  padded = true,
  footer
}: ScreenProps) {
  const { colors } = useTheme();
  const contentStyle = [padded && styles.padded, { gap: spacing.md }];

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[...contentStyle, styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, ...contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth }
});
