import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

import type { ColorTokens } from "@/theme/tokens";
import { fontFamily } from "@/theme/tokens";

/** Shared bottom-tab styling (docs/mobile-design-system.md §5.6). */
export function tabScreenOptions(colors: ColorTokens) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
    tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: 11 }
  } as const;
}

export function tabIcon(Icon: LucideIcon) {
  // Tint colours come from our string tokens, so narrowing ColorValue to string is safe here.
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon color={typeof color === "string" ? color : undefined} size={size} />;
  }
  return TabIcon;
}
