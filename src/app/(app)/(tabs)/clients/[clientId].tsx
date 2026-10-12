import * as Linking from "expo-linking";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { ucLinkDistributor, ucLinkLabel } from "@/features/clients/client.service";
import { ClientJourneyDetails } from "@/features/clients/components/ClientJourneyDetails";
import { useClient, useClientJourney } from "@/features/clients/useClients";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { useClientDocuments } from "@/features/documents/useDocuments";
import { useCreateTicket } from "@/features/support/useSupport";
import { formatDate, onlyDigits } from "@/lib/format";
import { clientStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * S16 — Detalhe do cliente (portal /clientes/[id]): summary + contact, UCs, documents tab, journey
 * details (portal acompanhamento modal) and "Abrir ticket de suporte" for this client.
 */
export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { me } = useAuthenticatedContext();
  const client = useClient(clientId);
  // Same query as <ClientJourneyDetails> (deduplicated by React Query): supplies the UC numbers.
  const journey = useClientJourney(clientId);
  const documents = useClientDocuments(clientId);
  const ticket = useCreateTicket();

  function openSupportTicket(name: string) {
    ticket.mutate(
      { category: "CADASTRO_DOCUMENTOS", clientId, subject: `Cliente ${name}` },
      { onSuccess: (created) => router.push({ pathname: "/support/[ticketId]", params: { ticketId: created.id } }) }
    );
  }

  return (
    <Screen
      edges={["left", "right"]}
      onRefresh={() => void Promise.all([client.refetch(), journey.refetch(), documents.refetch()])}
      refreshing={client.isRefetching}
    >
      <Stack.Screen options={{ title: "Detalhe do cliente" }} />
      <QueryState query={client} loadingLines={4}>
        {(data) => {
          const status = clientStatusLabel(data.status);
          const phone = onlyDigits(data.celular ?? data.telefone ?? "");
          const name = (data.tipo_pessoa === "JURIDICA" ? (data.razao_social ?? data.nome_completo) : data.nome_completo) ?? "Cliente";
          return (
            <View style={{ gap: spacing.md }}>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="title3">{name}</AppText>
                  <Badge label={status.label} tone={status.tone} />
                  <AppText variant="callout" tone="muted">
                    {[data.email, data.cidade && `${data.cidade}/${data.uf ?? ""}`, `Desde ${formatDate(data.created_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                  {phone ? (
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Button label="Ligar" variant="outline" onPress={() => void Linking.openURL(`tel:${phone}`)} />
                      <Button label="WhatsApp" variant="whatsapp" onPress={() => void Linking.openURL(`https://wa.me/55${phone}`)} />
                    </View>
                  ) : null}
                </View>
              </Card>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Unidades consumidoras
                  </AppText>
                  {data.vinculos_uc && data.vinculos_uc.length > 0 ? (
                    data.vinculos_uc.map((link) => (
                      <View key={link.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <AppText>
                          {ucLinkLabel(link, journey.data?.ucsPreview)}
                          {ucLinkDistributor(link) ? ` · ${ucLinkDistributor(link)}` : ""}
                        </AppText>
                        <Badge label={link.ativo ? "Ativa" : "Inativa"} tone={link.ativo ? "success" : "neutral"} />
                      </View>
                    ))
                  ) : (
                    <AppText tone="muted">Nenhuma UC vinculada.</AppText>
                  )}
                </View>
              </Card>
              <ClientJourneyDetails clientId={clientId} />
              <DocumentList title="Documentos do cliente" query={documents} emptyText="Nenhum documento deste cliente." />
              {hasPermission(me, "support:use") ? (
                <View style={{ gap: spacing.xs }}>
                  <Button
                    label="Abrir ticket de suporte"
                    variant="outline"
                    fullWidth
                    loading={ticket.isPending}
                    onPress={() => openSupportTicket(name)}
                  />
                  {ticket.error ? (
                    <AppText variant="callout" tone="danger">
                      {userMessage(ticket.error)}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
