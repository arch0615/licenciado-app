import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { PermissionState, QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { canCancelOrder } from "@/features/marketplace/marketplace.service";
import {
  useCancelOrder,
  useMarketplaceContext,
  useMarketplaceEnabled,
  useOrders,
  usePlaceOrder,
  useProducts
} from "@/features/marketplace/useMarketplace";
import { formatDate, formatNumber } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { orderStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * Marketplace (portal /marketplace): points balance, catalogue, redemption with confirmation, order history
 * and cancellation of pending orders. The backend validates balance, stock and monthly limits.
 */
export default function MarketplaceScreen() {
  const enabled = useMarketplaceEnabled();
  const context = useMarketplaceContext();
  const [search, setSearch] = useState("");
  const products = useProducts(useDebouncedValue(search));
  const orders = useOrders();
  const order = usePlaceOrder();
  const cancel = useCancelOrder();
  const actionError = order.error ?? cancel.error;

  if (!enabled) {
    return (
      <Screen edges={["left", "right"]}>
        <Stack.Screen options={{ title: "Marketplace" }} />
        <PermissionState message="O marketplace não está disponível para sua conta." />
      </Screen>
    );
  }

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Marketplace" }} />
      <QueryState query={context} loadingLines={1}>
        {(data) => (
          <Card variant="hero">
            <AppText variant="overline" tone="muted">
              Saldo disponível
            </AppText>
            <AppText variant="title1">{formatNumber(data.available_points)}</AppText>
            <AppText variant="caption" tone="muted">
              Resgates no mês: {formatNumber(data.month_purchases)} de {formatNumber(data.max_purchases_per_month)}
            </AppText>
          </Card>
        )}
      </QueryState>
      <TextField label="Buscar item" value={search} onChangeText={setSearch} />
      {actionError ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout">{userMessage(actionError)}</AppText>
        </Card>
      ) : null}
      <QueryState query={products} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Nenhum item encontrado.</AppText>}>
        {(list) => (
          <View style={{ gap: spacing.sm }}>
            {list.map((product) => (
              <Card key={product.id}>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="bodyStrong">{product.nome}</AppText>
                  {product.descricao ? <AppText tone="muted">{product.descricao}</AppText> : null}
                  <AppText variant="calloutStrong">{formatNumber(product.preco_pontos)} pontos</AppText>
                  {product.estoque_disponivel !== null ? (
                    <AppText variant="caption" tone="muted">
                      Estoque disponível: {formatNumber(product.estoque_disponivel)} unidades
                    </AppText>
                  ) : null}
                  <Button
                    label="Resgatar"
                    disabled={context.data?.can_purchase !== true || product.ativo === false}
                    loading={order.isPending && order.variables === product.id}
                    onPress={() =>
                      Alert.alert("Confirmar resgate?", `${product.nome} por ${formatNumber(product.preco_pontos)} pontos.`, [
                        { text: "Voltar", style: "cancel" },
                        { text: "Resgatar", onPress: () => order.mutate(product.id) }
                      ])
                    }
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
      <Card>
        <AppText variant="overline" tone="muted">
          Meus pedidos
        </AppText>
        <QueryState query={orders} loadingLines={1} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Nenhum pedido encontrado.</AppText>}>
          {(list) =>
            list.map((item) => {
              const status = orderStatusLabel(item.status);
              return (
                <ListRow
                  key={item.id}
                  title={item.produto?.nome ?? "Pedido"}
                  subtitle={`${formatDate(item.created_at)} · ${formatNumber(item.pontos_gastos)} pontos`}
                  right={<Badge label={status.label} tone={status.tone} />}
                  onPress={
                    canCancelOrder(item)
                      ? () =>
                          Alert.alert("Confirmar cancelamento", "Os pontos são devolvidos pelo sistema após o cancelamento.", [
                            { text: "Voltar", style: "cancel" },
                            { text: "Cancelar pedido", style: "destructive", onPress: () => cancel.mutate(item.id) }
                          ])
                      : undefined
                  }
                />
              );
            })
          }
        </QueryState>
      </Card>
    </Screen>
  );
}
