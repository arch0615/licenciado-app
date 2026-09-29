import { router } from "expo-router";
import { View } from "react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/theme/tokens";

/** S02 — Boas-vindas. */
export default function WelcomeScreen() {
  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={{ flex: 1, minHeight: 520, justifyContent: "space-between", paddingVertical: spacing.xxl }}>
        <View style={{ alignItems: "center", gap: spacing.md, marginTop: spacing.xxxl }}>
          <BrandMark size="lg" />
          <AppText tone="muted" align="center">
            Gerencie seus clientes, acompanhe comissões e sua equipe na palma da mão.
          </AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button label="Entrar" size="lg" fullWidth onPress={() => router.push("/login")} />
          <Button label="Quero ser Licenciado" variant="outline" fullWidth onPress={() => router.push("/register")} />
          <Button
            label="Recebi um convite"
            variant="ghost"
            fullWidth
            onPress={() => router.push("/register-sublicenciado")}
          />
        </View>
      </View>
    </Screen>
  );
}
