import { toPage } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/**
 * Marketplace (portal /marketplace): points context, catalogue, redemption, order history and cancellation.
 * Shown only when the server sends `features.marketplace === true` in /v1/auth/me. No local catalogue and no
 * client-side points arithmetic — balance, stock and limits are enforced by the backend.
 */
export type MarketplaceContext = {
  /** `null` when the backend value is missing or not numeric (shown as "—", never as 0). */
  available_points: number | null;
  month_purchases: number | null;
  max_purchases_per_month: number | null;
  can_purchase: boolean;
};

export type Product = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_pontos: number | null;
  imagem_principal_url?: string | null;
  ativo: boolean;
  /** Units available, as sent by the backend (`estoque_disponivel`); `null` when not sent or not numeric. */
  estoque_disponivel: number | null;
};

export type Order = {
  id: string;
  created_at: string;
  produto_id: string;
  produto?: { nome: string } | null;
  pontos_gastos: number | null;
  status: string;
};

/**
 * Points from the live API arrive as numeric strings ("1200"). Converts finite numbers and plain decimal
 * strings for display; anything else (empty, "abc", "12abc", NaN) becomes `null` — never a silent 0.
 * No arithmetic is done with these values: the backend stays the authority.
 */
export function toPoints(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

type RawRecord = Record<string, unknown>;

export function mapMarketplaceContext(raw: unknown): MarketplaceContext {
  const body = (raw && typeof raw === "object" ? raw : {}) as RawRecord;
  return {
    available_points: toPoints(body.available_points),
    month_purchases: toPoints(body.month_purchases),
    max_purchases_per_month: toPoints(body.max_purchases_per_month),
    can_purchase: body.can_purchase === true
  };
}

export function mapProduct(raw: RawRecord): Product {
  return { ...(raw as unknown as Product), preco_pontos: toPoints(raw.preco_pontos), estoque_disponivel: toPoints(raw.estoque_disponivel) };
}

export function mapOrder(raw: RawRecord): Order {
  return { ...(raw as unknown as Order), pontos_gastos: toPoints(raw.pontos_gastos) };
}

export async function getMarketplaceContext(api: ApiClient): Promise<MarketplaceContext> {
  return mapMarketplaceContext(await api.get<unknown>("/v1/pedidos/me/context"));
}

export async function listProducts(api: ApiClient, search: string): Promise<Product[]> {
  const body = await api.get<unknown>("/v1/produtos", {
    query: { search, tipo_publico: "LICENCIADO", ativo: true, page: 1, per_page: 100 }
  });
  return toPage<RawRecord>(body).items.map(mapProduct);
}

/** Balance, stock and limits are enforced atomically by the backend; Idempotency-Key prevents double orders. */
export async function placeOrder(api: ApiClient, productId: string, idempotencyKey: string): Promise<Order> {
  return mapOrder(await api.post<RawRecord>("/v1/pedidos", { produto_id: productId, quantidade: 1 }, { idempotencyKey }));
}

/** Portal: the user can cancel while the order is still pending/processing; the backend refunds the points. */
export const CANCELLABLE_ORDER_STATUSES = ["PENDENTE", "PROCESSANDO"];

export function canCancelOrder(order: Pick<Order, "status">): boolean {
  return CANCELLABLE_ORDER_STATUSES.includes(order.status);
}

export function cancelOrder(api: ApiClient, orderId: string): Promise<unknown> {
  return api.post(`/v1/pedidos/${encodeURIComponent(orderId)}/cancel`);
}

export async function listOrders(api: ApiClient): Promise<Order[]> {
  return toPage<RawRecord>(await api.get<unknown>("/v1/pedidos", { query: { page: 1, per_page: 100 } })).items.map(mapOrder);
}

