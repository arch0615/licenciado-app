import { Tabs } from "expo-router";
import { BookOpenCheck, Coins, House, Menu, Network, Users } from "lucide-react-native";

import { tabIcon, tabScreenOptions } from "@/components/navigation/tab-options";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";

const HomeIcon = tabIcon(House);
const ClientsIcon = tabIcon(Users);
const CommissionsIcon = tabIcon(Coins);
const TeamIcon = tabIcon(Network);
const AcademyIcon = tabIcon(BookOpenCheck);
const MoreIcon = tabIcon(Menu);

/**
 * Role-adaptive bottom navigation (docs/mobile-navigation.md §2.2):
 *   Licenciado:    Início · Clientes · Comissões · Equipe  · Mais
 *   Representante: Início · Clientes · Comissões · Academy · Mais
 * Tabs.Protected removes a tab entirely (no deep link) when the backend does not grant its permission:
 * Equipe needs `team:read`; Academy is the representative's 4th tab (`training:use`).
 * The backend still enforces access (e.g. /v1/sublicenciados/equipe returns 403 to representatives).
 */
export default function AppTabsLayout() {
  const { colors } = useTheme();
  const { role, me } = useAuthenticatedContext();

  return (
    <Tabs screenOptions={tabScreenOptions(colors)}>
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="clients" options={{ title: "Clientes", tabBarIcon: ClientsIcon }} />
      <Tabs.Screen name="commissions" options={{ title: "Comissões", tabBarIcon: CommissionsIcon }} />
      <Tabs.Protected guard={hasPermission(me, "team:read")}>
        <Tabs.Screen name="team" options={{ title: "Equipe", tabBarIcon: TeamIcon }} />
      </Tabs.Protected>
      <Tabs.Protected guard={role === "SUBLICENCIADO" && hasPermission(me, "training:use")}>
        <Tabs.Screen name="academy" options={{ title: "Academy", tabBarIcon: AcademyIcon }} />
      </Tabs.Protected>
      <Tabs.Screen name="more" options={{ title: "Mais", tabBarIcon: MoreIcon }} />
    </Tabs>
  );
}
