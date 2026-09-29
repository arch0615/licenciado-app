import { toPage } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/**
 * Marketplace (inventory MK1–MK7, business service, not in Swagger). Enabled only when the server
 * sends `features.marketplace === true` in /v1/auth/me. Catalog, balance, limits and prices come from
 * the backend — there is no local catalog and no client-side points arithmetic.
 */
export type MarketplaceContext = {
  available_points: number;
  month_purchases: number;
  max_purchases_per_month: number;
  can_purchase: boolean;
};

export type Product = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_pontos: number;
  imagem_principal_url?: string | null;
  ativo: boolean;
};

export type Order = {
  id: string;
  created_at: string;
  produto_id: string;
  produto?: { nome: string } | null;
  pontos_gastos: number;
  status: string;
};

export function getMarketplaceContext(api: ApiClient): Promise<MarketplaceContext> {
  return api.get<MarketplaceContext>("/v1/pedidos/me/context");
}

export async function listProducts(api: ApiClient, search: string): Promise<Product[]> {
  const body = await api.get<unknown>("/v1/produtos", {
    query: { search, tipo_publico: "LICENCIADO", ativo: true, page: 1, per_page: 100 }
  });
  return toPage<Product>(body).items;
}

export async function listOrders(api: ApiClient): Promise<Order[]> {
  return toPage<Order>(await api.get<unknown>("/v1/pedidos", { query: { page: 1, per_page: 100 } })).items;
}

/** Balance, stock and limits are enforced atomically by the backend; Idempotency-Key prevents double orders. */
export function placeOrder(api: ApiClient, productId: string, idempotencyKey: string): Promise<Order> {
  return api.post<Order>("/v1/pedidos", { produto_id: productId, quantidade: 1 }, { idempotencyKey });
}

export function cancelOrder(api: ApiClient, orderId: string): Promise<{ order: Order }> {
  return api.post(`/v1/pedidos/${encodeURIComponent(orderId)}/cancel`);
}
