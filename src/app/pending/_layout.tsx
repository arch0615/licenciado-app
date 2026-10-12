import { Tabs } from "expo-router";
import { BookOpenCheck, CircleUserRound, ClipboardList, LifeBuoy } from "lucide-react-native";

import { tabIcon, tabScreenOptions } from "@/components/navigation/tab-options";
import { useTheme } from "@/theme/ThemeProvider";

export const unstable_settings = { initialRouteName: "status" };

const StatusIcon = tabIcon(ClipboardList);
const AcademyIcon = tabIcon(BookOpenCheck);
const HelpIcon = tabIcon(LifeBuoy);
const ProfileIcon = tabIcon(CircleUserRound);

/**
 * PendingStack (N01): signed-in users whose registration is not approved yet.
 * Scope per decision D1 (to be confirmed by product): Cadastro · Academy · Ajuda · Perfil.
 */
export default function PendingLayout() {
  const { colors } = useTheme();
  return (
    <Tabs screenOptions={tabScreenOptions(colors)}>
      <Tabs.Screen name="status" options={{ title: "Cadastro", tabBarIcon: StatusIcon }} />
      <Tabs.Screen name="academy" options={{ title: "Academy", tabBarIcon: AcademyIcon }} />
      <Tabs.Screen name="help" options={{ title: "Ajuda", tabBarIcon: HelpIcon }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarIcon: ProfileIcon }} />
      {/* Detail routes inside the pending area: reachable by navigation, hidden from the tab bar. */}
      <Tabs.Screen name="support/new" options={{ href: null }} />
      <Tabs.Screen name="support/[ticketId]" options={{ href: null }} />
      <Tabs.Screen name="course/[courseId]" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}
