import { useNetInfo } from "@react-native-community/netinfo";
import { View } from "react-native";
import { WifiOff } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

/** Reactive connectivity banner (the web check ran once per render and never updated). */
export function OfflineBanner() {
  const { colors } = useTheme();
  const { isConnected } = useNetInfo();
  if (isConnected !== false) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: colors.warningBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <WifiOff size={16} color={colors.warning} />
      <AppText variant="caption" style={{ color: colors.warning }}>
        Sem conexão — mostrando dados salvos
      </AppText>
    </View>
  );
}
