import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { legalLinks } from "@/config/links";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { DocumentList, pickDocumentFile } from "@/features/documents/components/DocumentList";
import type { DocumentType } from "@/features/documents/document.service";
import { useOwnDocuments, useUploadOwnDocument } from "@/features/documents/useDocuments";
import { useProfile } from "@/features/profile/useProfile";
import { onlyDigits } from "@/lib/format";
import { onboardingStepLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

import { EDITABLE_ONBOARDING_STATUSES, TERMS_VERSION } from "../onboarding.service";
import { useOnboarding, useSaveOnboardingStep, useSubmitOnboarding, type OnboardingStepInput } from "../useOnboarding";

const legal = legalLinks();

type StepId = "documents" | "personal" | "company" | "bank" | "terms" | "companyCheck" | "login" | "review";
const LICENCIADO_STEPS: { id: StepId; label: string }[] = [
  { id: "documents", label: "Documentos" },
  { id: "personal", label: "Dados pessoais" },
  { id: "company", label: "Dados da empresa" },
  { id: "bank", label: "Dados bancários" },
  { id: "review", label: "Revisão" }
];
const SUBLICENCIADO_STEPS: { id: StepId; label: string }[] = [
  { id: "terms", label: "Termos" },
  { id: "companyCheck", label: "Conferência da empresa" },
  { id: "login", label: "Dados de acesso" },
  { id: "documents", label: "Documentos" },
  { id: "personal", label: "Dados pessoais" },
  { id: "review", label: "Revisão" }
];

type Values = Record<string, string>;
type FieldDef = { key: string; label: string; required?: boolean; keyboard?: "default" | "number-pad" | "phone-pad" | "email-address"; editable?: boolean; maxLength?: number };

const PERSONAL_FIELDS: FieldDef[] = [
  { key: "full_name", label: "Nome completo", required: true },
  { key: "cpf", label: "CPF", required: true, keyboard: "number-pad" },
  { key: "rg_number", label: "RG", required: true },
  { key: "rg_state", label: "UF do RG", required: true, maxLength: 2 },
  { key: "birth_date", label: "Data de nascimento (DD/MM/AAAA)", required: true, keyboard: "number-pad" },
  { key: "phone", label: "Telefone", required: true, keyboard: "phone-pad" },
  { key: "email", label: "E-mail", required: true, keyboard: "email-address", editable: false },
  { key: "cep", label: "CEP", required: true, keyboard: "number-pad" },
  { key: "logradouro", label: "Logradouro", required: true },
  { key: "numero", label: "Número", required: true },
  { key: "complemento", label: "Complemento (opcional)" },
  { key: "bairro", label: "Bairro", required: true },
  { key: "cidade", label: "Cidade", required: true },
  { key: "uf", label: "UF", required: true, maxLength: 2 }
];
const COMPANY_FIELDS: FieldDef[] = [
  { key: "cnpj", label: "CNPJ", required: true, keyboard: "number-pad" },
  { key: "company_name", label: "Razão social", required: true },
  { key: "trade_name", label: "Nome fantasia", required: true },
  { key: "operation_state", label: "UF de atuação", required: true, maxLength: 2 },
  { key: "operation_city", label: "Cidade de atuação", required: true }
];
const BANK_FIELDS: FieldDef[] = [
  { key: "bank_code", label: "Código do banco", required: true, keyboard: "number-pad" },
  { key: "bank_name", label: "Banco", required: true },
  { key: "agencia", label: "Agência", required: true, keyboard: "number-pad" },
  { key: "conta", label: "Conta", required: true, keyboard: "number-pad" },
  { key: "conta_digito", label: "Dígito", required: true, keyboard: "number-pad", maxLength: 2 },
  { key: "pix_chave", label: "Chave PIX (opcional)" }
];

const str = (value: unknown) => (typeof value === "string" ? value : "");
const toIsoDate = (br: string) => {
  const m = /^(\d{2})\/?(\d{2})\/?(\d{4})$/.exec(br.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : br.trim();
};
const toBrDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

function Fields({ fields, values, onChange, errors }: { fields: FieldDef[]; values: Values; onChange: (k: string, v: string) => void; errors: Values }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label + (field.required ? "" : "")}
          value={values[field.key] ?? ""}
          onChangeText={(v) => onChange(field.key, field.maxLength === 2 ? v.toUpperCase() : v)}
          keyboardType={field.keyboard ?? "default"}
          editable={field.editable !== false}
          maxLength={field.maxLength}
          autoCapitalize={field.keyboard === "email-address" ? "none" : undefined}
          error={errors[field.key]}
        />
      ))}
    </View>
  );
}

function missing(fields: FieldDef[], values: Values): Values {
  const errors: Values = {};
  for (const field of fields) if (field.required && !(values[field.key] ?? "").trim()) errors[field.key] = "Campo obrigatório.";
  return errors;
}

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", minHeight: 44 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: checked ? colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2
        }}
      >
        {checked ? <AppText tone="inverse">✓</AppText> : null}
      </View>
      <AppText style={{ flex: 1 }}>{label}</AppText>
    </Pressable>
  );
}

/**
 * Portal /onboarding wizard. Licenciado: Documentos → Dados pessoais → Empresa → Dados bancários → Revisão
 * (terms + submit). Representative: Termos → Conferência da empresa → Dados de acesso → Documentos →
 * Dados pessoais → Envio. Every step is saved to the backend; the backend decides when submission is allowed.
 */
export function OnboardingWizard() {
  const { me, role } = useAuthenticatedContext();
  const onboarding = useOnboarding();
  const profile = useProfile();
  const documents = useOwnDocuments();
  const upload = useUploadOwnDocument();
  const save = useSaveOnboardingStep();
  const submit = useSubmitOnboarding();
  const steps = role === "SUBLICENCIADO" ? SUBLICENCIADO_STEPS : LICENCIADO_STEPS;
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const [edits, setEdits] = useState<Values>({});
  const [errors, setErrors] = useState<Values>({});
  const [licType, setLicType] = useState<"EMPRESA" | "MEI">("EMPRESA");
  const [accountType, setAccountType] = useState<"CORRENTE" | "POUPANCA" | "PAGAMENTO">("CORRENTE");
  const [docType, setDocType] = useState<DocumentType>("RG");
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const status = onboarding.data?.status ?? "DRAFT";
  const editable = !onboarding.data || EDITABLE_ONBOARDING_STATUSES.includes(status);

  // Prefill from the business record (portal does the same).
  const record = (profile.data?.data ?? {}) as Record<string, unknown>;
  const prefill = useMemo<Values>(
    () => ({
      full_name: str(record.nome_completo),
      cpf: str(record.cpf),
      rg_number: str(record.rg_ie ?? record.rg).split("/")[0] ?? "",
      rg_state: str(record.rg_uf),
      birth_date: toBrDate(str(record.data_nascimento)),
      phone: str(record.celular ?? record.telefone),
      email: str(record.email) || me.email,
      cep: str(record.cep),
      logradouro: str(record.logradouro),
      numero: str(record.numero),
      complemento: str(record.complemento),
      bairro: str(record.bairro),
      cidade: str(record.cidade),
      uf: str(record.uf),
      cnpj: str(record.cnpj),
      company_name: str(record.razao_social),
      trade_name: str(record.nome_fantasia),
      operation_state: str(record.uf),
      operation_city: str(record.cidade),
      bank_code: str(record.banco_codigo),
      bank_name: str(record.banco_nome),
      agencia: str(record.agencia),
      conta: str(record.conta),
      conta_digito: str(record.conta_digito),
      pix_chave: str(record.pix_chave)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the record arrives
    [profile.data]
  );
  // User edits win over the prefilled record values.
  const values: Values = { ...prefill, ...edits };
  const onChange = (key: string, value: string) => setEdits((current) => ({ ...current, [key]: value }));
  const next = () => {
    setErrors({});
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  function run(input: OnboardingStepInput) {
    save.mutate(input, { onSuccess: next });
  }

  function saveCurrent() {
    const v = values;
    if (step.id === "personal") {
      const e = missing(PERSONAL_FIELDS, v);
      if (onlyDigits(v.cpf ?? "").length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
      if (onlyDigits(v.cep ?? "").length !== 8) e.cep = "CEP deve ter 8 dígitos.";
      setErrors(e);
      if (Object.keys(e).length) return;
      run({
        step: "personal",
        data: {
          full_name: v.full_name!.trim(),
          cpf: onlyDigits(v.cpf!),
          rg_number: v.rg_number!.trim(),
          rg_state: v.rg_state!.trim().toUpperCase(),
          birth_date: toIsoDate(v.birth_date!),
          phone: onlyDigits(v.phone!),
          email: v.email!.trim(),
          cep: onlyDigits(v.cep!),
          logradouro: v.logradouro!.trim(),
          numero: v.numero!.trim(),
          complemento: v.complemento?.trim() || undefined,
          bairro: v.bairro!.trim(),
          cidade: v.cidade!.trim(),
          uf: v.uf!.trim().toUpperCase()
        }
      });
    } else if (step.id === "company") {
      const e = missing(COMPANY_FIELDS, v);
      if (onlyDigits(v.cnpj ?? "").length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
      setErrors(e);
      if (Object.keys(e).length) return;
      run({
        step: "professional",
        data: {
          licenciado_type: licType,
          cnpj: onlyDigits(v.cnpj!),
          company_name: v.company_name!.trim(),
          trade_name: v.trade_name!.trim(),
          operation_state: v.operation_state!.trim().toUpperCase(),
          operation_city: v.operation_city!.trim()
        }
      });
    } else if (step.id === "bank") {
      const e = missing(BANK_FIELDS, v);
      setErrors(e);
      if (Object.keys(e).length) return;
      run({
        step: "bank",
        data: {
          bank_code: v.bank_code!.trim(),
          bank_name: v.bank_name!.trim(),
          agencia: v.agencia!.trim(),
          conta: v.conta!.trim(),
          conta_digito: v.conta_digito!.trim(),
          tipo_conta: accountType,
          ...(v.pix_chave?.trim() ? { pix_chave: v.pix_chave.trim() } : {})
        }
      });
    } else if (step.id === "documents") {
      run({ step: "documents" });
    } else if (step.id === "terms") {
      run({ step: "terms", data: { accepted_contract: accepted, accepted_privacy_policy: accepted, digital_signature: signature.trim(), terms_version: TERMS_VERSION } });
    } else if (step.id === "companyCheck") {
      const parentCode = profile.data?.role === "SUBLICENCIADO" ? profile.data.data.codigo_licenciado : "";
      run({ step: "company", codigoLicenciado: parentCode });
    } else if (step.id === "login") {
      run({ step: "login", email: values.email || me.email });
    }
  }

  async function uploadDoc() {
    const file = await pickDocumentFile();
    if (file) upload.mutate({ tipo: docType, file });
  }

  async function finish() {
    if (role === "LICENCIADO") {
      // Licenciado: terms are accepted explicitly on the review step, then submitted.
      await save.mutateAsync({ step: "terms", data: { accepted_contract: accepted, accepted_privacy_policy: accepted, digital_signature: signature.trim(), terms_version: TERMS_VERSION } });
    }
    submit.mutate(undefined, { onSuccess: () => router.replace("/pending/status") });
  }

  if (!editable) {
    return (
      <Card>
        <AppText tone="muted">
          {status === "EM_ANALISE" ? "Seu cadastro está em análise e não pode ser alterado agora." : "Seu cadastro não pode ser alterado no momento."}
        </AppText>
      </Card>
    );
  }

  const termsBlock = (
    <View style={{ gap: spacing.sm }}>
      {legal.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {legal.map((link) => (
            <Button key={link.label} label={`Ler ${link.label}`} variant="ghost" onPress={() => void Linking.openURL(link.url)} />
          ))}
        </View>
      ) : null}
      <Checkbox
        checked={accepted}
        onToggle={() => setAccepted((a) => !a)}
        label="Li e aceito os Termos de Uso, a Política de Privacidade (LGPD) e o contrato de licenciamento ACVEL."
      />
      <TextField label="Assinatura digital (digite seu nome completo)" value={signature} onChangeText={setSignature} autoCapitalize="words" />
    </View>
  );
  const termsReady = accepted && signature.trim().length >= 5;
  const busy = save.isPending || submit.isPending;
  const error = save.error ?? submit.error ?? upload.error;

  return (
    <View style={{ gap: spacing.md }}>
      <ChipGroup options={steps.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.label}` }))} value={String(index)} onChange={(v) => setIndex(Number(v))} />
      {onboarding.data?.reprovado_motivo ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout">Motivo da reprovação: {onboarding.data.reprovado_motivo}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title3">{step.label}</AppText>

          {step.id === "documents" ? (
            <View style={{ gap: spacing.sm }}>
              <AppText tone="muted">Envie uma foto ou PDF legível do seu documento (RG ou CNH{role === "LICENCIADO" ? "; cartão CNPJ se tiver" : ""}).</AppText>
              <ChipGroup
                options={[
                  { value: "RG", label: "RG" },
                  { value: "CNH", label: "CNH" },
                  ...(role === "LICENCIADO" ? [{ value: "CNPJ", label: "Cartão CNPJ" }] : [])
                ]}
                value={docType}
                onChange={(v) => setDocType(v as DocumentType)}
              />
              <Button label="Enviar documento" variant="outline" loading={upload.isPending} onPress={() => void uploadDoc()} />
              <DocumentList title="Enviados" query={documents} />
            </View>
          ) : null}
          {step.id === "personal" ? <Fields fields={PERSONAL_FIELDS} values={values} onChange={onChange} errors={errors} /> : null}
          {step.id === "company" ? (
            <View style={{ gap: spacing.sm }}>
              <ChipGroup options={[{ value: "EMPRESA", label: "Empresa" }, { value: "MEI", label: "MEI" }]} value={licType} onChange={(v) => setLicType(v as "EMPRESA" | "MEI")} />
              <Fields fields={COMPANY_FIELDS} values={values} onChange={onChange} errors={errors} />
            </View>
          ) : null}
          {step.id === "bank" ? (
            <View style={{ gap: spacing.sm }}>
              <ChipGroup
                options={[
                  { value: "CORRENTE", label: "Corrente" },
                  { value: "POUPANCA", label: "Poupança" },
                  { value: "PAGAMENTO", label: "Pagamento" }
                ]}
                value={accountType}
                onChange={(v) => setAccountType(v as typeof accountType)}
              />
              <Fields fields={BANK_FIELDS} values={values} onChange={onChange} errors={errors} />
            </View>
          ) : null}
          {step.id === "terms" ? termsBlock : null}
          {step.id === "companyCheck" && profile.data?.role === "SUBLICENCIADO" ? (
            <View style={{ gap: spacing.xs }}>
              <AppText>Licenciado: {profile.data.data.licenciado.nome_fantasia ?? profile.data.data.licenciado.razao_social ?? profile.data.data.codigo_licenciado}</AppText>
              <AppText tone="muted">CNPJ: {profile.data.data.licenciado.cnpj ?? "—"} · Código: {profile.data.data.codigo_licenciado}</AppText>
              <Checkbox checked={confirmed} onToggle={() => setConfirmed((c) => !c)} label="Confirmo que estes são os dados da empresa à qual vou me vincular." />
            </View>
          ) : null}
          {step.id === "login" ? (
            <View style={{ gap: spacing.xs }}>
              <TextField label="E-mail de acesso" value={values.email || me.email} editable={false} />
              <Checkbox checked={confirmed} onToggle={() => setConfirmed((c) => !c)} label="Confirmo que este é o e-mail que vou usar para entrar." />
            </View>
          ) : null}
          {step.id === "review" ? (
            <View style={{ gap: spacing.sm }}>
              <AppText tone="muted">
                {onboarding.data?.can_submit
                  ? "Tudo pronto. Envie seu cadastro para análise da ACVEL."
                  : `Pendências: ${onboarding.data?.pendencias.map(onboardingStepLabel).join(", ") || "complete as etapas anteriores."}`}
              </AppText>
              {role === "LICENCIADO" ? termsBlock : null}
            </View>
          ) : null}

          {error ? (
            <AppText variant="callout" tone="danger">
              {error instanceof Error && !("status" in error) ? error.message : userMessage(error)}
            </AppText>
          ) : null}

          {step.id === "review" ? (
            <Button
              label="Enviar para análise"
              size="lg"
              fullWidth
              loading={busy}
              disabled={role === "LICENCIADO" && !termsReady}
              onPress={() => void finish()}
            />
          ) : (
            <Button
              label="Salvar e continuar"
              size="lg"
              fullWidth
              loading={busy}
              disabled={(step.id === "terms" && !termsReady) || ((step.id === "companyCheck" || step.id === "login") && !confirmed)}
              onPress={saveCurrent}
            />
          )}
          {index > 0 ? <Button label="Voltar" variant="ghost" fullWidth onPress={() => setIndex((i) => i - 1)} /> : null}
        </View>
      </Card>
    </View>
  );
}
