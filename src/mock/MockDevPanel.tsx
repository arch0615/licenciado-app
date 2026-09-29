import { useSyncExternalStore } from "react";
import { Pressable, Switch, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { authGateway } from "@/services/runtime";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

import type { MockAuthGateway } from "./mock-auth-gateway";
import { mockState } from "./mock-state";
import { MOCK_PERSONAS } from "./personas";

/** Development-only panel: sign in as a persona, simulate maintenance. */
export function MockDevPanel() {
  const { colors } = useTheme();
  const snapshot = useSyncExternalStore(
    (listener) => mockState.subscribe(listener),
    () => `${mockState.currentPersonaId ?? "none"}|${mockState.maintenanceEnabled}`
  );
  const [currentPersona, maintenance] = snapshot.split("|");
  const gateway = authGateway as MockAuthGateway;

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="overline" tone="warning">
          Modo demonstração (EXPO_PUBLIC_USE_MOCKS)
        </AppText>
        <AppText variant="callout" tone="muted">
          Dados fictícios, sem servidor. Escolha um perfil para testar a navegação.
        </AppText>
        {MOCK_PERSONAS.map((persona) => {
          const active = persona.id === currentPersona;
          return (
            <Pressable
              key={persona.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => void gateway.signInAsPersona(persona.id)}
              style={{
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.muted : "transparent",
                borderRadius: radius.md,
                padding: spacing.sm
              }}
            >
              <AppText variant="calloutStrong">{persona.label}</AppText>
              <AppText variant="caption" tone="muted">
                {persona.email} · {persona.description}
              </AppText>
            </Pressable>
          );
        })}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="calloutStrong">Simular manutenção</AppText>
          <Switch
            accessibilityLabel="Simular manutenção"
            value={maintenance === "true"}
            onValueChange={(value) => mockState.setMaintenance(value)}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </View>
    </Card>
  );
}
