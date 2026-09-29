import { router, type Href } from "expo-router";
import { View } from "react-native";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { AccountSection } from "@/features/profile/AccountSection";
import { spacing } from "@/theme/tokens";

type Item = { title: string; subtitle?: string; href: Href; visible: boolean };

/** Mais — profile header, grouped menu (Conta, Negócio, Ajuda), Aparência, Sair. */
export default function MoreScreen() {
  const { me, role } = useAuthenticatedContext();
  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Conta",
      items: [
        { title: "Meus dados", href: "/more/profile", visible: hasPermission(me, "profile:read") },
        { title: "Segurança", subtitle: "Senha, dispositivos e exclusão de conta", href: "/more/security", visible: true },
        { title: "Termos e privacidade", subtitle: "Documentos legais e contrato", href: "/more/legal", visible: true }
      ]
    },
    {
      title: "Negócio",
      items: [
        {
          title: "Academy",
          subtitle: "Cursos e trilhas",
          href: "/courses",
          // Representatives have Academy as a tab.
          visible: role === "LICENCIADO" && hasPermission(me, "training:use")
        },
        {
          title: "Marketplace",
          subtitle: "Troque seus pontos",
          href: "/marketplace",
          visible: hasPermission(me, "marketplace:use") && me.features?.marketplace === true
        }
      ]
    },
    {
      title: "Ajuda",
      items: [
        { title: "Suporte", subtitle: "Chamados e mensagens", href: "/support", visible: hasPermission(me, "support:use") },
        { title: "Notificações", href: "/notifications", visible: hasPermission(me, "notifications:read") }
      ]
    }
  ];

  return (
    <Screen>
      <ScreenHeader title="Mais" showNotifications />
      {groups.map((group) => {
        const items = group.items.filter((item) => item.visible);
        if (items.length === 0) return null;
        return (
          <Card key={group.title}>
            <View style={{ gap: spacing.xxs }}>
              <AppText variant="overline" tone="muted">
                {group.title}
              </AppText>
              {items.map((item) => (
                <ListRow key={item.title} title={item.title} subtitle={item.subtitle} onPress={() => router.push(item.href)} />
              ))}
            </View>
          </Card>
        );
      })}
      <AccountSection me={me} />
    </Screen>
  );
}
