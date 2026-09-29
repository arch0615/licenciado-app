/** Normalized page used by every list hook. */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/**
 * The ACVEL services return lists in several envelopes (documented in backend-api-inventory.md):
 * bare arrays, `{ data, meta: { total, page, perPage } }`, `{ items, total, page, pageSize }`,
 * `{ total, data }`. This reads any of them without inventing values.
 */
export function toPage<T>(body: unknown, fallback: { page?: number; pageSize?: number } = {}): Page<T> {
  if (Array.isArray(body)) {
    return { items: body as T[], total: body.length, page: fallback.page ?? 1, pageSize: fallback.pageSize ?? body.length };
  }
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const items = (Array.isArray(record.data) ? record.data : Array.isArray(record.items) ? record.items : []) as T[];
  const meta = (typeof record.meta === "object" && record.meta !== null ? record.meta : record) as Record<string, unknown>;
  const num = (value: unknown, otherwise: number) => (typeof value === "number" && Number.isFinite(value) ? value : otherwise);
  return {
    items,
    total: num(meta.total, items.length),
    page: num(meta.page, fallback.page ?? 1),
    pageSize: num(meta.perPage ?? meta.per_page ?? meta.pageSize, fallback.pageSize ?? items.length)
  };
}
