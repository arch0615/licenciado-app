import { router, Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { PermissionState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { EMAIL_PATTERN } from "@/features/auth/password-policy";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useCreateClient } from "@/features/clients/useClients";
import { onlyDigits } from "@/lib/format";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

type Kind = "FISICA" | "JURIDICA";

/**
 * S17 step 1 — Novo cliente (C3). The backend assigns tenant, owner and user; the app sends only the
 * client's data. Documents/UC steps (K1–K6) follow in the client onboarding flow.
 */
export default function NewClientScreen() {
  const { me } = useAuthenticatedContext();
  const create = useCreateClient();
  const [kind, setKind] = useState<Kind>("FISICA");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!hasPermission(me, "clients:write")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Novo cliente" }} />
        <PermissionState message="Você não tem permissão para cadastrar clientes." />
      </Screen>
    );
  }

  function submit() {
    const next: Record<string, string> = {};
    const digits = onlyDigits(document);
    if (name.trim().length < 3) next.name = kind === "FISICA" ? "Informe o nome completo." : "Informe o nome do responsável.";
    if (kind === "JURIDICA" && company.trim().length < 2) next.company = "Informe a razão social.";
    if (digits.length !== (kind === "FISICA" ? 11 : 14)) next.document = kind === "FISICA" ? "CPF deve ter 11 dígitos." : "CNPJ deve ter 14 dígitos.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (onlyDigits(phone).length < 10) next.phone = "Informe um telefone com DDD.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate(
      {
        tipo_pessoa: kind,
        nome_completo: name.trim(),
        razao_social: kind === "JURIDICA" ? company.trim() : undefined,
        cpf: kind === "FISICA" ? digits : undefined,
        cnpj: kind === "JURIDICA" ? digits : undefined,
        email: email.trim().toLowerCase(),
        telefone: phone
      },
      { onSuccess: ({ id }) => router.replace({ pathname: "/clients/[clientId]", params: { clientId: id } }) }
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Novo cliente" }} />
      <View style={{ gap: spacing.md }}>
        <ChipGroup
          options={[
            { value: "FISICA", label: "Pessoa física" },
            { value: "JURIDICA", label: "Empresa" }
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === "JURIDICA" ? (
          <TextField label="Razão social" value={company} onChangeText={setCompany} error={errors.company} />
        ) : null}
        <TextField
          label={kind === "FISICA" ? "Nome completo" : "Nome do responsável"}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label={kind === "FISICA" ? "CPF" : "CNPJ"}
          value={document}
          onChangeText={setDocument}
          error={errors.document}
          keyboardType="number-pad"
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField label="Celular (WhatsApp)" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" />
        {create.error ? (
          <Card variant="alert" tone="danger">
            <AppText variant="callout">{userMessage(create.error)}</AppText>
          </Card>
        ) : null}
        <Button label="Cadastrar cliente" size="lg" fullWidth loading={create.isPending} onPress={submit} />
      </View>
    </Screen>
  );
}
