import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { QueryState } from "@/components/states/QueryState";
import { EmptyState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ticketStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import { TICKET_CATEGORIES, whatsappSupportUrl, type TicketCategory, type TicketStatus } from "../support.service";
import {
  useCreateTicket,
  useResolveTicket,
  useSendTicketMessage,
  useTicket,
  useTicketMessages,
  useTickets,
  useWhatsappSupport
} from "../useSupport";

/** Route prefix of the area hosting support ("/support" approved, "/pending/support" pending). */
export type SupportBase = "/support" | "/pending/support";

const categoryLabel = (value: string) => TICKET_CATEGORIES.find((item) => item.value === value)?.label ?? "Outros";

type StatusFilter = "ALL" | TicketStatus;
type CategoryFilter = "ALL" | TicketCategory;
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "AGUARDANDO", label: "Aguardando" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "RESOLVIDO", label: "Resolvido" }
];
const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [{ value: "ALL", label: "Todas" }, ...TICKET_CATEGORIES];

/** Portal floating WhatsApp button — shown only when the backend has a support number configured. */
export function WhatsAppSupportButton() {
  const whatsapp = useWhatsappSupport();
  if (!whatsapp.data) return null;
  return <Button label="Fale com a ACVEL pelo WhatsApp" variant="whatsapp" fullWidth onPress={() => void Linking.openURL(whatsappSupportUrl(whatsapp.data!))} />;
}

export function TicketList({ base }: { base: SupportBase }) {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search);
  const tickets = useTickets({
    status: status === "ALL" ? undefined : status,
    category: category === "ALL" ? undefined : category,
    query: query || undefined
  });
  const items = tickets.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = status !== "ALL" || category !== "ALL" || Boolean(query);
  const openNew = () => router.push(`${base}/new`);
  return (
    <View style={{ gap: spacing.md }}>
      <WhatsAppSupportButton />
      <Button label="Abrir ticket" fullWidth onPress={openNew} />
      <TextField label="Buscar por protocolo" value={search} onChangeText={setSearch} autoCapitalize="characters" autoCorrect={false} />
      <ChipGroup options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <ChipGroup options={CATEGORY_FILTERS} value={category} onChange={setCategory} />
      <QueryState
        query={tickets}
        isEmpty={() => items.length === 0}
        empty={
          filtered ? (
            <AppText tone="muted">Nenhum ticket encontrado com esses filtros.</AppText>
          ) : (
            <EmptyState title="Nenhum ticket encontrado" message="Fale com a equipe ACVEL quando precisar." action={{ label: "Abrir ticket", onPress: openNew }} />
          )
        }
      >
        {() => (
          <Card>
            {items.map((ticket) => {
              const status = ticketStatusLabel(ticket.status);
              return (
                <ListRow
                  key={ticket.id}
                  title={ticket.subject || categoryLabel(ticket.category)}
                  subtitle={`Protocolo ${ticket.id} · ${formatDateTime(ticket.updatedAt)}`}
                  right={<Badge label={status.label} tone={status.tone} />}
                  onPress={() => router.push({ pathname: `${base}/[ticketId]`, params: { ticketId: ticket.id } })}
                />
              );
            })}
            {tickets.hasNextPage ? (
              <Button label="Carregar mais" variant="ghost" loading={tickets.isFetchingNextPage} onPress={() => void tickets.fetchNextPage()} />
            ) : null}
          </Card>
        )}
      </QueryState>
    </View>
  );
}

export function NewTicketForm({ base }: { base: SupportBase }) {
  const create = useCreateTicket();
  const [category, setCategory] = useState<TicketCategory>("CADASTRO_DOCUMENTOS");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (message.trim().length < 5) return setError("Descreva sua dúvida.");
    setError(null);
    create.mutate(
      { category, subject: subject.trim() || undefined, initialMessage: message.trim() },
      { onSuccess: (ticket) => router.replace({ pathname: `${base}/[ticketId]`, params: { ticketId: ticket.id } }) }
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="calloutStrong">Categoria</AppText>
      <ChipGroup options={TICKET_CATEGORIES} value={category} onChange={setCategory} />
      <TextField label="Assunto (opcional)" value={subject} onChangeText={setSubject} />
      <TextField label="Mensagem" value={message} onChangeText={setMessage} multiline numberOfLines={5} error={error} />
      <AppText variant="caption" tone="muted">
        Envio de anexos ainda não está disponível no aplicativo.
      </AppText>
      {create.error ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout">{userMessage(create.error)}</AppText>
        </Card>
      ) : null}
      <Button label="Enviar" size="lg" fullWidth loading={create.isPending} onPress={submit} />
    </View>
  );
}

export function TicketConversation({ ticketId }: { ticketId: string }) {
  const ticket = useTicket(ticketId);
  const messages = useTicketMessages(ticketId);
  const send = useSendTicketMessage(ticketId);
  const resolve = useResolveTicket(ticketId);
  const [text, setText] = useState("");
  const resolved = ticket.data?.status === "RESOLVIDO";

  return (
    <View style={{ gap: spacing.md }}>
      <QueryState query={ticket} loadingLines={1}>
        {(data) =>
          data ? (
            <Card>
              <AppText variant="bodyStrong">{data.subject || categoryLabel(data.category)}</AppText>
              <AppText variant="caption" tone="muted">
                Protocolo {data.id} · aberto em {formatDateTime(data.createdAt)}
              </AppText>
              <View style={{ marginTop: spacing.xs }}>
                <Badge label={ticketStatusLabel(data.status).label} tone={ticketStatusLabel(data.status).tone} />
              </View>
            </Card>
          ) : (
            <AppText tone="muted">Ticket não encontrado.</AppText>
          )
        }
      </QueryState>
      <QueryState query={messages} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Sem mensagens.</AppText>}>
        {(list) => (
          <View style={{ gap: spacing.sm }}>
            {list.map((message) => {
              const mine = message.sender === "USER";
              return (
                <View key={message.id} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                  <Card tone={mine ? "primary" : "neutral"} style={{ maxWidth: "85%" }}>
                    <AppText>{message.text}</AppText>
                    <AppText variant="caption" tone="muted">
                      {mine ? "Você" : message.sender === "BOT" ? "Assistente" : "Equipe ACVEL"} · {formatDateTime(message.sentAt)}
                    </AppText>
                  </Card>
                </View>
              );
            })}
          </View>
        )}
      </QueryState>
      {!resolved && ticket.data ? (
        <View style={{ gap: spacing.sm }}>
          <TextField label="Responder" value={text} onChangeText={setText} multiline />
          {send.error || resolve.error ? (
            <AppText variant="callout" tone="danger">
              {userMessage(send.error ?? resolve.error)}
            </AppText>
          ) : null}
          <Button
            label="Enviar"
            fullWidth
            loading={send.isPending}
            onPress={() => {
              if (text.trim()) send.mutate(text.trim(), { onSuccess: () => setText("") });
            }}
          />
          <Button
            label="Fechar como resolvido"
            variant="ghost"
            fullWidth
            loading={resolve.isPending}
            onPress={() =>
              Alert.alert("Confirmar resolução", "Essa ação finaliza o atendimento.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Resolver ticket", onPress: () => resolve.mutate() }
              ])
            }
          />
        </View>
      ) : null}
    </View>
  );
}
