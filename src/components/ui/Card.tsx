import type { PropsWithChildren } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { elevation, radius, spacing, type Tone, toneColors } from "@/theme/tokens";

type CardProps = PropsWithChildren<{
  onPress?: () => void;
  /** `alert` adds a 4px left border in the tone colour. */
  variant?: "default" | "hero" | "alert";
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

/** ACVELCard — surface for grouped content. */
export function Card({ children, onPress, variant = "default", tone = "primary", style, accessibilityLabel }: CardProps) {
  const { colors, scheme } = useTheme();
  const surface: ViewStyle = {
    backgroundColor: variant === "hero" ? colors.secondary : colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: scheme === "light" && variant !== "hero" ? 1 : 0,
    borderColor: colors.border,
    ...(variant === "alert" ? { borderLeftWidth: 4, borderLeftColor: toneColors(colors, tone).fg } : null),
    ...(scheme === "light" ? elevation.card : null)
  };

  if (!onPress) return <View style={[surface, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [surface, { opacity: pressed ? 0.9 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
