import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

import { AppText } from "./AppText";

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  icon?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Pressable row used by menus and simple lists (min 48pt touch target). */
export function ListRow({ title, subtitle, right, icon, onPress, accessibilityLabel }: ListRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        minHeight: 52,
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.6 : 1
      })}
    >
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}
