import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { radius, touchTarget } from "@/theme/tokens";

import { AppText } from "./AppText";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "whatsapp";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  size?: "md" | "lg";
};

/**
 * ACVELButton. While `loading`, presses are ignored (double-submit protection)
 * and the width is kept so the layout doesn't jump.
 */
export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  icon,
  fullWidth = false,
  size = "md",
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    secondary: { bg: colors.muted, fg: colors.foreground, border: colors.muted },
    outline: { bg: "transparent", fg: colors.foreground, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    destructive: { bg: colors.dangerSolid, fg: colors.dangerSolidForeground, border: colors.dangerSolid },
    whatsapp: { bg: colors.whatsapp, fg: "#FFFFFF", border: colors.whatsapp }
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={loading ? undefined : onPress}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      style={(state) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          minHeight: size === "lg" ? 52 : touchTarget,
          opacity: isDisabled && !loading ? 0.4 : state.pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "auto"
        },
        typeof style === "function" ? style(state) : style
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText variant="calloutStrong" style={{ color: palette.fg }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 }
});
