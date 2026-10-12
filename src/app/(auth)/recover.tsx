import { useState } from "react";
import { View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { AuthError } from "@/features/auth/auth-gateway";
import { EMAIL_PATTERN } from "@/features/auth/password-policy";
import { usePasswordReset } from "@/features/auth/useAuthActions";
import { spacing } from "@/theme/tokens";

/** S06 — Recuperar senha (Firebase password-reset e-mail; neutral message, no account enumeration). */
export default function RecoverScreen() {
  const reset = usePasswordReset();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSubmit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError("Informe um e-mail válido.");
      return;
    }
    setFieldError(null);
    reset.mutate(email.trim().toLowerCase());
  }

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <View style={{ gap: spacing.md }}>
        {reset.isSuccess ? (
          <Card variant="alert" tone="success">
            <AppText variant="callout" accessibilityLiveRegion="polite">
              Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.
            </AppText>
          </Card>
        ) : (
          <>
            <AppText tone="muted">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</AppText>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              error={fieldError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            {reset.error ? (
              <Card variant="alert" tone="danger">
                <AppText variant="callout">
                  {reset.error instanceof AuthError ? reset.error.message : "Não foi possível enviar. Tente novamente."}
                </AppText>
              </Card>
            ) : null}
            <Button label="Enviar link de recuperação" size="lg" fullWidth loading={reset.isPending} onPress={handleSubmit} />
          </>
        )}
      </View>
    </Screen>
  );
}
