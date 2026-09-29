/**
 * Display formatting only. Values are always the backend's — the app never computes money,
 * commissions or points (backend values are authoritative).
 */
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");

export function formatCurrency(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? currency.format(value) : "—";
}

export function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? integer.format(value) : "—";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "2026-08" → "ago/2026". */
export function formatCompetencia(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})/.exec(value ?? "");
  if (!match) return value ?? "—";
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(match[2]) - 1] ?? match[2]}/${match[1]}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
