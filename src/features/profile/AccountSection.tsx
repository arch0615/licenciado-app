import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { useState } from "react";

import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AuthMe } from "@/features/auth/types";
import { useSession } from "@/features/auth/SessionProvider";
import { accountStatusLabel, roleLabels } from "@/lib/status-labels";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" }
];

/** Profile header + Aparência + Sair — shared by the pending "Perfil" tab and the approved "Mais" tab. */
export function AccountSection({ me }: { me: AuthMe }) {
  const { colors, preference, setPreference } = useTheme();
  const { signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const status = accountStatusLabel(me.accountStatus);
  const initials = (me.displayName ?? me.email).trim().slice(0, 2).toUpperCase();

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.muted,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <AppText variant="title3" tone="primary">
              {initials}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">{me.displayName ?? me.email}</AppText>
            <AppText variant="caption" tone="muted">
              {roleLabels[me.tipoUsuarioResolvido]} · {me.email}
            </AppText>
            <Badge label={status.label} tone={status.tone} />
          </View>
        </View>
      </Card>

      <Card>
        <AppText variant="overline" tone="muted">
          Aparência
        </AppText>
        {THEME_OPTIONS.map((option) => {
          const selected = option.value === preference;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPreference(option.value)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: 48,
                borderRadius: radius.sm
              }}
            >
              <AppText>{option.label}</AppText>
              {selected ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>

      <Button
        label="Sair"
        variant="outline"
        fullWidth
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        }}
      />
    </View>
  );
}
