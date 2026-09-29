import { useState } from "react";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { TextField } from "@/components/forms/TextField";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { formatDate, onlyDigits } from "@/lib/format";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import type { AccountProfile } from "../types";
import { useProfile, useUpdateProfile } from "../useProfile";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText>{value || "—"}</AppText>
    </View>
  );
}

function rows(profile: AccountProfile): [string, string | null | undefined][] {
  const data = profile.data;
  const address = [data.logradouro, data.numero, data.bairro, data.cidade && `${data.cidade}/${data.uf ?? ""}`]
    .filter(Boolean)
    .join(", ");
  const base: [string, string | null | undefined][] = [
    ["Nome", data.nome_completo],
    ["E-mail", data.email],
    ["Telefone", data.telefone],
    ["CPF", data.cpf],
    ["Endereço", address || null],
    ["Cadastro", formatDate(data.created_at)]
  ];
  if (profile.role === "LICENCIADO") {
    return [
      ["Código de licenciado", profile.data.codigo_licenciado],
      ["Cupom", profile.data.codigo_cupom],
      ...base,
      ["Razão social", profile.data.razao_social],
      ["CNPJ", profile.data.cnpj]
    ];
  }
  const parent = profile.data.licenciado;
  return [
    ["Código de representante", profile.data.codigo_sublicenciado],
    ["Cupom", profile.data.codigo_cupom],
    ...base,
    ["Licenciado", parent.nome_fantasia ?? parent.razao_social ?? parent.codigo_licenciado]
  ];
}

/**
 * Meus dados — GET /v1/{licenciados|sublicenciados}/me; edits name/phone with PATCH .../me.
 * E-mail and documents are not editable here (the backend requires the auth provider/review flow).
 */
export function ProfileDetails() {
  const { me } = useAuthenticatedContext();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const canEdit = hasPermission(me, "profile:update");

  if (me.approvalStatus === "NO_RECORD") {
    return (
      <Card>
        <AppText tone="muted">Seu cadastro ainda não foi iniciado. Seus dados aparecem aqui depois do primeiro passo.</AppText>
      </Card>
    );
  }

  return (
    <QueryState query={profile} loadingLines={4}>
      {(data) => (
        <View style={{ gap: spacing.md }}>
          <Card>
            <View style={{ gap: spacing.sm }}>
              {rows(data).map(([label, value]) => (
                <Field key={label} label={label} value={value} />
              ))}
            </View>
          </Card>
          {canEdit && !editing ? (
            <Button
              label="Editar nome e telefone"
              variant="outline"
              fullWidth
              onPress={() => {
                setName(data.data.nome_completo ?? "");
                setPhone(data.data.telefone ?? "");
                update.reset();
                setEditing(true);
              }}
            />
          ) : null}
          {editing ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <TextField label="Nome completo" value={name} onChangeText={setName} autoComplete="name" />
                <TextField
                  label="Telefone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                {update.error ? (
                  <AppText variant="callout" tone="danger">
                    {userMessage(update.error)}
                  </AppText>
                ) : null}
                <Button
                  label="Salvar"
                  fullWidth
                  loading={update.isPending}
                  onPress={() =>
                    update.mutate(
                      { nome_completo: name.trim(), telefone: onlyDigits(phone) },
                      { onSuccess: () => setEditing(false) }
                    )
                  }
                />
                <Button label="Cancelar" variant="ghost" fullWidth onPress={() => setEditing(false)} />
              </View>
            </Card>
          ) : null}
        </View>
      )}
    </QueryState>
  );
}
