import { View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { radius, type Tone, toneColors } from "@/theme/tokens";

import { AppText } from "./AppText";

type BadgeProps = {
  label: string;
  tone?: Tone;
  dot?: boolean;
};

/**
 * StatusBadge primitive. Always pass a human, accented Portuguese label
 * (map backend enums through a status map — never render raw enum values).
 */
export function Badge({ label, tone = "neutral", dot = true }: BadgeProps) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 3
      }}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} /> : null}
      <AppText variant="caption" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}
