import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { QueryState } from "@/components/states/QueryState";
import { EmptyState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { alertSeverityTone, clientStatusLabel, JOURNEY_STAGES, journeyStageLabel, journeyStatusLabel } from "@/lib/status-labels";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { spacing } from "@/theme/tokens";

import type { JourneyFilters } from "../client.service";
import type { Client, ClientFilters, ClientStatus } from "../types";
import { useClients, useJourneyBoard, usePendingActions } from "../useClients";

type StatusChip = "ALL" | ClientStatus;
const STATUS_CHIPS: { value: StatusChip; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDENTE_APROVACAO", label: "Em ativação" },
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
/** City + state fields shared by the client and journey filters (portal "Cidade" / "UF"). */
function CityStateFields({ city, uf, onCity, onUf }: { city: string; uf: string; onCity: (v: string) => void; onUf: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <View style={{ flex: 3 }}>
        <TextField label="Cidade" value={city} onChangeText={onCity} autoCorrect={false} />
      </View>
      <View style={{ flex: 1 }}>
        <TextField
          label="UF"
          value={uf}
          onChangeText={(v) => onUf(v.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase())}
          autoCapitalize="characters"
          maxLength={2}
        />
      </View>
    </View>
  );
}

function FiltersToggle({ open, onToggle, active }: { open: boolean; onToggle: () => void; active: boolean }) {
  return <Button label={open ? "Ocultar filtros" : active ? "Filtros (ativos)" : "Filtros"} variant="ghost" onPress={onToggle} />;
}

export function ClientPortfolio({ onShareLink }: { onShareLink: () => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusChip>("ALL");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebouncedValue(search);
  const debouncedCity = useDebouncedValue(city);
  const filters: ClientFilters = {
    search: debounced || undefined,
    status: status === "ALL" ? undefined : status,
    cidade: debouncedCity.trim() || undefined,
    uf: uf.length === 2 ? uf : undefined
  };
  const clients = useClients(filters);
  const items = clients.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(filters.search || filters.status || filters.cidade || filters.uf);
  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setCity("");
    setUf("");
  };

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <TextField
        label="Buscar"
        placeholder="Nome ou CPF/CNPJ"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ChipGroup options={STATUS_CHIPS} value={status} onChange={setStatus} />
      <FiltersToggle open={showFilters} active={Boolean(filters.cidade || filters.uf)} onToggle={() => setShowFilters((v) => !v)} />
      {showFilters ? <CityStateFields city={city} uf={uf} onCity={setCity} onUf={setUf} /> : null}
      <QueryState
        query={clients}
        isEmpty={() => items.length === 0}
        empty={
          hasFilters ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              message="Tente outro nome ou limpe os filtros."
              action={{ label: "Limpar filtros", onPress: clearFilters }}
            />
          ) : (
            <EmptyState
              title="Sua carteira está vazia"
              message="Envie seu link de cadastro: os clientes que se cadastrarem por ele aparecem aqui."
              action={{ label: "Enviar link de cadastro", onPress: onShareLink }}
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
type Toggle = "withDocumentPending" | "withInvoiceOverdue" | "compensating" | "notCompensating";
const JOURNEY_TOGGLES: { value: Toggle; label: string }[] = [
  { value: "withDocumentPending", label: "Com pendências de documento" },
  { value: "withInvoiceOverdue", label: "Com fatura em atraso" },
  { value: "compensating", label: "Compensando" },
  { value: "notCompensating", label: "Não compensando" }
];
const STAGE_CHIPS = [{ value: "ALL", label: "Todas as etapas" }, ...JOURNEY_STAGES];

export function ClientJourneyBoard() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("ALL");
  const [toggles, setToggles] = useState<Set<Toggle>>(new Set());
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebouncedValue(search);
  const debouncedCity = useDebouncedValue(city);
  const filters: JourneyFilters = {
    query: debounced || undefined,
    journeyStage: stage === "ALL" ? undefined : stage,
    withDocumentPending: toggles.has("withDocumentPending") || undefined,
    withInvoiceOverdue: toggles.has("withInvoiceOverdue") || undefined,
    compensating: toggles.has("compensating") ? true : toggles.has("notCompensating") ? false : undefined,
    cidade: debouncedCity.trim() || undefined,
    uf: uf.length === 2 ? uf : undefined
  };
  const board = useJourneyBoard(filters);
  const toggle = (value: Toggle) =>
    setToggles((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else {
        next.add(value);
        if (value === "compensating") next.delete("notCompensating");
        if (value === "notCompensating") next.delete("compensating");
      }
      return next;
    });
  const advancedActive = toggles.size > 0 || Boolean(filters.cidade || filters.uf);
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <TextField label="Buscar" placeholder="Nome, CPF/CNPJ ou UC" value={search} onChangeText={setSearch} />
      <ChipGroup options={STAGE_CHIPS} value={stage} onChange={setStage} />
      <FiltersToggle open={showFilters} active={advancedActive} onToggle={() => setShowFilters((v) => !v)} />
      {showFilters ? (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {JOURNEY_TOGGLES.map((item) => (
              <Chip key={item.value} label={item.label} selected={toggles.has(item.value)} onPress={() => toggle(item.value)} />
            ))}
          </View>
          <CityStateFields city={city} uf={uf} onCity={setCity} onUf={setUf} />
        </View>
      ) : null}
      <QueryState
        query={board}
        isEmpty={(cards) => cards.length === 0}
        empty={
          <AppText tone="muted">
            {filters.query || filters.journeyStage || advancedActive
              ? "Nenhum cliente encontrado para os filtros aplicados."
              : "Sem clientes no acompanhamento"}
          </AppText>
        }
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
              const status = { ...journeyStatusLabel(item.clientStatus), label: journeyStageLabel(item.journeyStage) };
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
      empty={<AppText tone="muted">Sem alertas no momento</AppText>}
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
                    Ação: {item.recommended_action_label}
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
