import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Text wordmark placeholder. Replace with the vector ACVEL logo once delivered
 * (decision D14 in docs/mobile-mvp-scope.md — only PNG logos exist today).
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="image" accessibilityLabel="ACVEL — Energia por assinatura" style={{ alignItems: "center" }}>
      <AppText variant={size === "lg" ? "display" : "title1"} style={{ color: colors.primary, letterSpacing: 4 }}>
        ACVEL
      </AppText>
      <AppText variant="overline" tone="muted">
        Energia por assinatura
      </AppText>
    </View>
  );
}
