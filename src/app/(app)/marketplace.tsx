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
import {
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

/** Marketplace (MK1–MK6). Everything — catalog, balance, limits — comes from the backend. */
export default function MarketplaceScreen() {
  const enabled = useMarketplaceEnabled();
  const context = useMarketplaceContext();
  const [search, setSearch] = useState("");
  const products = useProducts(useDebouncedValue(search));
  const orders = useOrders();
  const order = usePlaceOrder();

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
              Seus pontos
            </AppText>
            <AppText variant="title1">{formatNumber(data.available_points)}</AppText>
            <AppText variant="caption" tone="muted">
              Resgates no mês: {data.month_purchases} de {data.max_purchases_per_month}
            </AppText>
          </Card>
        )}
      </QueryState>
      <TextField label="Buscar" value={search} onChangeText={setSearch} />
      {order.error ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout">{userMessage(order.error)}</AppText>
        </Card>
      ) : null}
      <QueryState query={products} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Nenhum produto disponível.</AppText>}>
        {(list) => (
          <View style={{ gap: spacing.sm }}>
            {list.map((product) => (
              <Card key={product.id}>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="bodyStrong">{product.nome}</AppText>
                  {product.descricao ? <AppText tone="muted">{product.descricao}</AppText> : null}
                  <AppText variant="calloutStrong">{formatNumber(product.preco_pontos)} pontos</AppText>
                  <Button
                    label="Resgatar"
                    disabled={context.data?.can_purchase === false}
                    loading={order.isPending && order.variables === product.id}
                    onPress={() =>
                      Alert.alert("Confirmar resgate?", `${product.nome} por ${formatNumber(product.preco_pontos)} pontos.`, [
                        { text: "Cancelar", style: "cancel" },
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
        <QueryState query={orders} loadingLines={1} isEmpty={(list) => list.length === 0} empty={<AppText tone="muted">Nenhum pedido.</AppText>}>
          {(list) =>
            list.map((item) => {
              const status = orderStatusLabel(item.status);
              return (
                <ListRow
                  key={item.id}
                  title={item.produto?.nome ?? "Pedido"}
                  subtitle={`${formatDate(item.created_at)} · ${formatNumber(item.pontos_gastos)} pontos`}
                  right={<Badge label={status.label} tone={status.tone} />}
                />
              );
            })
          }
        </QueryState>
      </Card>
    </Screen>
  );
}
