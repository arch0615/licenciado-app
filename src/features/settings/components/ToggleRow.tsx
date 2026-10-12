import { Switch, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

type ToggleRowProps = { title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean };

export function ToggleRow({ title, subtitle, value, onChange, disabled }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary }} />
    </View>
  );
}
