import * as Linking from "expo-linking";
import { useState } from "react";
import { View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { config } from "@/config/env";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import { AuthError } from "../auth-gateway";
import { EMAIL_PATTERN, passwordMeetsPolicy } from "../password-policy";
import { PasswordChecklist } from "./PasswordChecklist";

export type RegisterValues = { displayName: string; email: string; password: string };

type Props = {
  submitLabel: string;
  /** Pre-filled, locked e-mail (e-mail-restricted invitation). */
  lockedEmail?: string | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: RegisterValues) => void;
};

/**
 * Shared registration form (S04/S05, docs/mobile-forms.md §2.2–2.3). The terms line only informs;
 * explicit, versioned acceptance happens in onboarding and is never done on the user's behalf.
 */
export function RegisterForm({ submitLabel, lockedEmail, submitting, error, onSubmit }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"displayName" | "email" | "password" | "confirm", string>>>({});

  function handleSubmit() {
    const next: typeof errors = {};
    if (displayName.trim().length < 3) next.displayName = "Informe o nome completo.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (!passwordMeetsPolicy(password)) next.password = "A senha não atende aos requisitos.";
    if (confirm !== password) next.confirm = "As senhas não conferem.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({ displayName: displayName.trim(), email: email.trim().toLowerCase(), password });
  }

  const errorText = error ? (error instanceof AuthError ? error.message : userMessage(error)) : null;

  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label="Nome completo"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        editable={!lockedEmail}
        helper={lockedEmail ? "Este convite é válido apenas para este e-mail." : undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <PasswordChecklist value={password} />
      <TextField
        label="Confirmar senha"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <AppText variant="caption" tone="muted">
        Ao criar a conta você concorda com os{" "}
        {config.termsUrl ? (
          <AppText variant="caption" tone="primary" onPress={() => void Linking.openURL(config.termsUrl)}>
            Termos de Uso
          </AppText>
        ) : (
          "Termos de Uso"
        )}{" "}
        e a{" "}
        {config.privacyUrl ? (
          <AppText variant="caption" tone="primary" onPress={() => void Linking.openURL(config.privacyUrl)}>
            Política de Privacidade
          </AppText>
        ) : (
          "Política de Privacidade"
        )}
        . O contrato e os documentos legais serão apresentados para sua leitura e aceite no cadastro.
      </AppText>
      {errorText ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout" accessibilityLiveRegion="polite">
            {errorText}
          </AppText>
        </Card>
      ) : null}
      <Button label={submitLabel} size="lg" fullWidth loading={submitting} onPress={handleSubmit} />
    </View>
  );
}
