import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { spacing } from "@/theme/tokens";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows the notifications bell (approved area only). */
  showNotifications?: boolean;
  right?: ReactNode;
};

/** Tab-root header: large title + bell (docs/mobile-navigation.md §2.2). */
export function ScreenHeader({ title, subtitle, showNotifications = false, right }: ScreenHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="callout" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showNotifications ? <NotificationBell /> : null}
    </View>
  );
}
