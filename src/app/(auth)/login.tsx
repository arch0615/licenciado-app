import { Link } from "expo-router";
import { useRef, useState } from "react";
import { type TextInput, View } from "react-native";

import { DevTools } from "@/components/dev/DevTools";
import { TextField } from "@/components/forms/TextField";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { AuthError } from "@/features/auth/auth-gateway";
import { useSession } from "@/features/auth/SessionProvider";
import { spacing } from "@/theme/tokens";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * S03 — Login. After a successful sign-in the SessionProvider resolves /v1/auth/me and the root
 * layout moves the user to the right group; this screen never navigates by itself.
 */
export default function LoginScreen() {
  const { signIn } = useSession();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Informe um e-mail válido.";
    if (!password) errors.password = "Informe sua senha.";
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password) return;

    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <View style={{ gap: spacing.md }}>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />
        <Link href="/recover" style={{ alignSelf: "flex-end" }}>
          <AppText variant="calloutStrong" tone="primary">
            Esqueci minha senha
          </AppText>
        </Link>
        {formError ? (
          <Card variant="alert" tone="danger">
            <AppText variant="callout" accessibilityLiveRegion="polite">
              {formError}
            </AppText>
          </Card>
        ) : null}
        <Button label="Entrar" size="lg" fullWidth loading={submitting} onPress={() => void handleSubmit()} />
      </View>
      <DevTools />
    </Screen>
  );
}
