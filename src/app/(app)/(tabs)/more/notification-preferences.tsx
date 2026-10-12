import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { PermissionState, QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { ToggleRow } from "@/features/settings/components/ToggleRow";
import { NOTIFICATION_PREFERENCE_LABELS, type NotificationPreferences } from "@/features/settings/settings.service";
import { useNotificationPreferences, useSaveNotificationPreferences } from "@/features/settings/useSettings";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

const KEYS = Object.keys(NOTIFICATION_PREFERENCE_LABELS) as (keyof NotificationPreferences)[];

/** Mais → Preferências de notificação (portal /notificacoes/configuracoes). Saved only on "Salvar". */
export default function NotificationPreferencesScreen() {
  const { role } = useAuthenticatedContext();
  if (role !== "LICENCIADO") {
    // Reached only by a direct link: the settings API exists for licenciados only.
    return (
      <Screen edges={["left", "right"]}>
        <Stack.Screen options={{ title: "Preferências de notificação" }} />
        <PermissionState message="Disponível apenas para licenciados." />
      </Screen>
    );
  }
  return <NotificationPreferencesScreenContent />;
}

function NotificationPreferencesScreenContent() {
  const query = useNotificationPreferences();
  const save = useSaveNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Preferências de notificação" }} />
      <QueryState query={query}>
        {(data) => {
          const value = draft ?? data;
          return (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <AppText tone="muted">Escolha quais avisos você quer receber.</AppText>
                {KEYS.map((key) => (
                  <ToggleRow
                    key={key}
                    title={NOTIFICATION_PREFERENCE_LABELS[key].title}
                    subtitle={NOTIFICATION_PREFERENCE_LABELS[key].subtitle}
                    value={value[key]}
                    onChange={(v) => setDraft({ ...value, [key]: v })}
                  />
                ))}
                {save.error ? (
                  <AppText variant="callout" tone="danger">
                    {userMessage(save.error)}
                  </AppText>
                ) : null}
                {save.isSuccess && !draft ? (
                  <AppText variant="callout" tone="success">
                    Preferências salvas com sucesso.
                  </AppText>
                ) : null}
                <Button
                  label="Salvar preferências"
                  fullWidth
                  disabled={!draft}
                  loading={save.isPending}
                  onPress={() => draft && save.mutate(draft, { onSuccess: () => setDraft(null) })}
                />
              </View>
            </Card>
          );
        }}
      </QueryState>
    </Screen>
  );
}
