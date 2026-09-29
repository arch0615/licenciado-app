import { Text, type TextProps } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import type { TypographyVariant } from "@/theme/tokens";

export type TextTone = "default" | "muted" | "primary" | "danger" | "success" | "warning" | "inverse";

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: "left" | "center" | "right";
};

/** Typography primitive (ACVELText). Scales with the OS font size setting. */
export function AppText({ variant = "body", tone = "default", align, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
    inverse: colors.primaryForeground
  }[tone];
  return (
    <Text
      maxFontSizeMultiplier={2}
      style={[typography[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
