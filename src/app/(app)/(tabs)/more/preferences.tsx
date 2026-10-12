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
import { CHANNEL_LABELS, CHANNELS, type Preferences } from "@/features/settings/settings.service";
import { usePreferences, useSavePreferences } from "@/features/settings/useSettings";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * Mais → Preferências (portal /perfil/preferencias): contact channels and LGPD consents. Every consent is an
 * explicit toggle saved only on "Salvar"; nothing is pre-accepted by the app.
 */
export default function PreferencesScreen() {
  const { role } = useAuthenticatedContext();
  if (role !== "LICENCIADO") {
    // Reached only by a direct link: the settings API exists for licenciados only.
    return (
      <Screen edges={["left", "right"]}>
        <Stack.Screen options={{ title: "Preferências" }} />
        <PermissionState message="Disponível apenas para licenciados." />
      </Screen>
    );
  }
  return <PreferencesScreenContent />;
}

function PreferencesScreenContent() {
  const query = usePreferences();
  const save = useSavePreferences();
  const [draft, setDraft] = useState<Preferences | null>(null);

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Preferências" }} />
      <QueryState query={query}>
        {(data) => {
          const value = draft ?? data;
          return (
            <View style={{ gap: spacing.md }}>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Canais de contato
                  </AppText>
                  {CHANNELS.map((channel) => (
                    <ToggleRow
                      key={channel}
                      title={CHANNEL_LABELS[channel]}
                      value={value.notifications[channel]}
                      onChange={(v) => setDraft({ ...value, notifications: { ...value.notifications, [channel]: v } })}
                    />
                  ))}
                </View>
              </Card>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Privacidade (LGPD)
                  </AppText>
                  <ToggleRow
                    title="Receber comunicações de marketing"
                    value={value.privacy.marketingOptIn}
                    onChange={(v) => setDraft({ ...value, privacy: { ...value.privacy, marketingOptIn: v } })}
                  />
                  <AppText variant="caption" tone="muted">
                    Autorizo a ACVEL a me contatar por:
                  </AppText>
                  {CHANNELS.map((channel) => (
                    <ToggleRow
                      key={channel}
                      title={CHANNEL_LABELS[channel]}
                      value={value.privacy.channelConsent[channel]}
                      onChange={(v) =>
                        setDraft({ ...value, privacy: { ...value.privacy, channelConsent: { ...value.privacy.channelConsent, [channel]: v } } })
                      }
                    />
                  ))}
                </View>
              </Card>
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
                size="lg"
                fullWidth
                disabled={!draft}
                loading={save.isPending}
                onPress={() => draft && save.mutate(draft, { onSuccess: () => setDraft(null) })}
              />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
