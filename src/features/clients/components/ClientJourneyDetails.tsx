import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { formatCompetencia, formatCurrency, formatDate } from "@/lib/format";
import { journeyStageLabel, ucRequestStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

import type { JourneyStep } from "../types";
import { useClientJourney } from "../useClients";

const STEP_MARK: Record<JourneyStep["state"], string> = {
  DONE: "✓",
  CURRENT: "●",
  PENDING: "○",
  BLOCKED: "!",
  SKIPPED: "–"
};

const INVOICE_LABELS: Record<string, string> = { PAGA: "Paga", ATRASO: "Em atraso", SEM_FATURA: "Sem fatura", ABERTA: "Em aberto" };

const isHttps = (url: string | null | undefined): url is string => typeof url === "string" && url.startsWith("https://");

/**
 * Journey for one client (portal /acompanhamento client modal): stage, step-by-step journey, next action,
 * UC requests with the consumer's signing link (copy, as in the portal), invoices and gerador interest.
 * All values come from GET /v1/acompanhamento/{id}.
 */
export function ClientJourneyDetails({ clientId }: { clientId: string }) {
  const journey = useClientJourney(clientId);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, url: string) {
    await Clipboard.setStringAsync(url);
    setCopied(id);
  }

  return (
    <QueryState query={journey} loadingLines={2}>
      {(card) => (
        <View style={{ gap: spacing.md }}>
          <Card>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="overline" tone="muted">
                Jornada do cadastro
              </AppText>
              {card.journeyStage ? (
                <AppText variant="bodyStrong">
                  {journeyStageLabel(card.journeyStage)}
                  {card.journeyStageOrder ? ` · Etapa ${card.journeyStageOrder} de 7` : ""}
                </AppText>
              ) : null}
              {card.journeySubStatus ? (
                <AppText variant="callout" tone="muted">
                  {card.journeySubStatus}
                </AppText>
              ) : null}
              {card.clientJourney && card.clientJourney.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  {card.clientJourney.map((step) => (
                    <View key={step.key} style={{ flexDirection: "row", gap: spacing.sm }}>
                      <AppText tone={step.state === "DONE" ? "success" : step.state === "BLOCKED" ? "danger" : "muted"}>
                        {STEP_MARK[step.state]}
                      </AppText>
                      <View style={{ flex: 1 }}>
                        <AppText variant={step.state === "CURRENT" ? "bodyStrong" : "body"}>{step.label}</AppText>
                        {step.detail || step.date ? (
                          <AppText variant="caption" tone="muted">
                            {[step.detail, step.date && formatDate(step.date)].filter(Boolean).join(" · ")}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {card.nextRecommendedActionLabel ? (
                <AppText variant="calloutStrong" tone="primary">
                  Próxima ação: {card.nextRecommendedActionLabel}
                </AppText>
              ) : null}
            </View>
          </Card>

          {card.solicitacoesUc && card.solicitacoesUc.length > 0 ? (
            <Card>
              <AppText variant="overline" tone="muted">
                UCs e faturas
              </AppText>
              {card.solicitacoesUc.map((request) => (
                <View key={request.id} style={{ gap: spacing.xxs, paddingVertical: spacing.xs }}>
                  <AppText variant="bodyStrong">
                    {request.numeroUc ? `UC ${request.numeroUc}` : "Unidade consumidora"}
                    {request.concessionaria ? ` · ${request.concessionaria}` : ""}
                  </AppText>
                  {request.status ? <Badge label={ucRequestStatusLabel(request.status)} tone="info" /> : null}
                  {request.motivoReprovacao ? (
                    <AppText variant="callout" tone="danger">
                      {request.motivoReprovacao}
                    </AppText>
                  ) : null}
                  {isHttps(request.contrato?.signingUrl) ? (
                    <Button
                      label={copied === request.id ? "Link de assinatura copiado" : "Copiar link de assinatura"}
                      variant="ghost"
                      onPress={() => void copy(request.id, request.contrato!.signingUrl!)}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {card.invoices && card.invoices.length > 0 ? (
            <Card>
              <AppText variant="overline" tone="muted">
                Faturas
              </AppText>
              {card.invoices.map((invoice, index) => (
                <ListRow
                  key={invoice.invoiceId ?? String(index)}
                  title={formatCompetencia(invoice.competency)}
                  subtitle={invoice.dueAt ? `Vencimento ${formatDate(invoice.dueAt)}` : null}
                  right={
                    <View style={{ alignItems: "flex-end" }}>
                      <AppText variant="bodyStrong">{formatCurrency(invoice.totalValue)}</AppText>
                      <AppText variant="caption" tone="muted">
                        {INVOICE_LABELS[invoice.status ?? ""] ?? "—"}
                      </AppText>
                    </View>
                  }
                />
              ))}
            </Card>
          ) : null}

          {card.geradorInterest?.hasOpenRequest ? (
            <Card variant="alert" tone="highlight">
              <AppText variant="bodyStrong">⚡ Cliente quer ser gerador</AppText>
              <AppText variant="callout" tone="muted">
                Interesse em ser gerador de energia registrado{card.geradorInterest.requestStatus === "CONTACTED" ? " — já contatado" : " — aguardando contato"}.
              </AppText>
            </Card>
          ) : null}
        </View>
      )}
    </QueryState>
  );
}
