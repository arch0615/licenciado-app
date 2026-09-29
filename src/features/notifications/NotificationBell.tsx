import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Bell } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

import { useNotificationSummary } from "./useNotifications";

/** Header bell with the backend unread count (B17). */
export function NotificationBell() {
  const { colors } = useTheme();
  const summary = useNotificationSummary();
  const unread = summary.data?.unreadCount ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
      onPress={() => router.push("/notifications")}
      style={{
        width: touchTarget,
        height: touchTarget,
        borderRadius: touchTarget / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.muted
      }}
    >
      <Bell size={22} color={colors.foreground} />
      {unread > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.danger
          }}
        >
          <AppText variant="caption" tone="inverse">
            {unread > 99 ? "99+" : unread}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
