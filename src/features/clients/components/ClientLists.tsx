import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { QueryState } from "@/components/states/QueryState";
import { EmptyState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { alertSeverityTone, clientStatusLabel, journeyStatusLabel } from "@/lib/status-labels";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { spacing } from "@/theme/tokens";

import type { Client, ClientFilters, ClientStatus } from "../types";
import { useClients, useJourneyBoard, usePendingActions } from "../useClients";

type StatusChip = "ALL" | ClientStatus;
const STATUS_CHIPS: { value: StatusChip; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDENTE_APROVACAO", label: "Em cadastro" },
  { value: "APROVADO", label: "Ativos" },
  { value: "INATIVO", label: "Inativos" }
];

const openClient = (id: string) => router.push({ pathname: "/clients/[clientId]", params: { clientId: id } });

function ClientCard({ client }: { client: Client }) {
  const status = clientStatusLabel(client.status);
  const name = client.tipo_pessoa === "JURIDICA" ? (client.razao_social ?? client.nome_completo) : client.nome_completo;
  return (
    <Card onPress={() => openClient(client.id)} accessibilityLabel={`${name ?? "Cliente"}, ${status.label}`}>
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {name ?? "Cliente sem nome"}
          </AppText>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <AppText variant="caption" tone="muted">
          {[client.cidade && `${client.cidade}/${client.uf ?? ""}`, `Desde ${formatDate(client.created_at)}`]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      </View>
    </Card>
  );
}

/** Carteira — C1 with debounced search, status chips and infinite scroll. */
export function ClientPortfolio({ onNewClient }: { onNewClient: () => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusChip>("ALL");
  const debounced = useDebouncedValue(search);
  const filters: ClientFilters = { search: debounced || undefined, status: status === "ALL" ? undefined : status };
  const clients = useClients(filters);
  const items = clients.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(filters.search || filters.status);

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <TextField
        label="Buscar"
        placeholder="Nome, CPF ou CNPJ"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ChipGroup options={STATUS_CHIPS} value={status} onChange={setStatus} />
      <QueryState
        query={clients}
        isEmpty={() => items.length === 0}
        empty={
          hasFilters ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              message="Tente outro nome ou limpe os filtros."
              action={{ label: "Limpar filtros", onPress: () => (setSearch(""), setStatus("ALL")) }}
            />
          ) : (
            <EmptyState
              title="Sua carteira está vazia"
              message="Cadastre seu primeiro cliente ou envie seu link de cadastro."
              action={{ label: "Novo cliente", onPress: onNewClient }}
            />
          )
        }
      >
        {() => (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ClientCard client={item} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            contentContainerStyle={{ paddingBottom: spacing.xxxl }}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (clients.hasNextPage && !clients.isFetchingNextPage) void clients.fetchNextPage();
            }}
            refreshing={clients.isRefetching && !clients.isFetchingNextPage}
            onRefresh={() => void clients.refetch()}
            ListFooterComponent={clients.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.md }} /> : null}
          />
        )}
      </QueryState>
    </View>
  );
}

/** Jornada — T1 cards grouped visually by stage label (backend decides the stage). */
export function ClientJourneyBoard() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const board = useJourneyBoard(debounced);
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <TextField label="Buscar" placeholder="Nome do cliente" value={search} onChangeText={setSearch} />
      <QueryState
        query={board}
        isEmpty={(cards) => cards.length === 0}
        empty={<AppText tone="muted">Nenhum cliente em acompanhamento.</AppText>}
      >
        {(cards) => (
          <FlatList
            data={cards}
            keyExtractor={(card) => card.consumidorId}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            contentContainerStyle={{ paddingBottom: spacing.xxxl }}
            refreshing={board.isRefetching}
            onRefresh={() => void board.refetch()}
            renderItem={({ item }) => {
              const status = journeyStatusLabel(item.clientStatus);
              return (
                <Card onPress={() => openClient(item.consumidorId)}>
                  <View style={{ gap: spacing.xxs }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                      <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {item.clientName}
                      </AppText>
                      <Badge label={status.label} tone={status.tone} />
                    </View>
                    {item.nextRecommendedActionLabel ? (
                      <AppText variant="callout" tone="primary">
                        {item.nextRecommendedActionLabel}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" tone="muted">
                      {item.metrics.totalUcs} UC(s) · {item.metrics.totalUcsCompensando} compensando
                      {item.lastActionLabel ? ` · ${item.lastActionLabel}` : ""}
                    </AppText>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </QueryState>
    </View>
  );
}

/** Pendências — T4 alerts; each opens the client. */
export function ClientPendingActions() {
  const alerts = usePendingActions();
  return (
    <QueryState
      query={alerts}
      isEmpty={(list) => list.length === 0}
      empty={<AppText tone="muted">Nenhuma pendência. Tudo em dia!</AppText>}
    >
      {(list) => (
        <FlatList
          data={list}
          keyExtractor={(alert) => alert.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          refreshing={alerts.isRefetching}
          onRefresh={() => void alerts.refetch()}
          renderItem={({ item }) => (
            <Card onPress={() => openClient(item.consumidor_id)} variant="alert" tone={alertSeverityTone(item.severidade)}>
              <View style={{ gap: spacing.xxs }}>
                <AppText variant="bodyStrong">{item.titulo}</AppText>
                <AppText variant="callout" tone="muted">
                  {item.descricao}
                </AppText>
                {item.recommended_action_label ? (
                  <AppText variant="calloutStrong" tone="primary">
                    {item.recommended_action_label}
                  </AppText>
                ) : null}
              </View>
            </Card>
          )}
        />
      )}
    </QueryState>
  );
}
