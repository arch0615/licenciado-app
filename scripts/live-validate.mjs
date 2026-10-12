#!/usr/bin/env node
/**
 * Live API validation (read-only) against the real ACVEL backend.
 *
 *   npm run validate:live -- --label licenciado        (credentials from validation-results/accounts.env)
 *   LIVE_EMAIL=... LIVE_PASSWORD=... npm run validate:live -- --label licenciado
 *
 * - Signs in with Firebase Auth REST (same project/API key as the app, from .env) and exercises the
 *   token lifecycle: ID token, refresh with the refresh token, and a call with the refreshed token.
 * - Calls each module the app uses, in the app's validation order, with the SAME paths and query
 *   parameters as the services, and compares response fields with the fields the app reads.
 * - Read-only: no POST/PUT/PATCH/DELETE is sent (writes are validated separately, with approval).
 * - Output keeps only HTTP status, timing, envelope and field names — never values, tokens or PII.
 *   Credentials are read from env vars and never written anywhere.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const label = process.argv.includes("--label") ? process.argv[process.argv.indexOf("--label") + 1] : "account";

function loadEnv() {
  const env = {};
  if (existsSync(".env")) {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match) env[match[1]] = match[2];
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
// Per-account credentials from validation-results/accounts.env (git-ignored): LIVE_<LABEL>_EMAIL / _PASSWORD.
if (!env.LIVE_EMAIL && existsSync("validation-results/accounts.env")) {
  const prefix = `LIVE_${label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`;
  for (const line of readFileSync("validation-results/accounts.env", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] === `${prefix}EMAIL`) env.LIVE_EMAIL = match[2].trim();
    if (match?.[1] === `${prefix}PASSWORD`) env.LIVE_PASSWORD = match[2];
  }
}
const AUTH = env.EXPO_PUBLIC_AUTH_API_URL;
const BUSINESS = env.EXPO_PUBLIC_BUSINESS_API_URL;
const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const { LIVE_EMAIL, LIVE_PASSWORD } = env;

if (!API_KEY || !AUTH || !BUSINESS) throw new Error("Missing EXPO_PUBLIC_FIREBASE_API_KEY / AUTH / BUSINESS URL in .env");
if (!LIVE_EMAIL || !LIVE_PASSWORD) {
  throw new Error(`No credentials for "${label}": set LIVE_EMAIL/LIVE_PASSWORD or fill validation-results/accounts.env`);
}

const results = [];
const shape = (value) => {
  if (Array.isArray(value)) return { type: "array", length: value.length, item: value[0] ? shape(value[0]) : null };
  if (value && typeof value === "object") return { type: "object", keys: Object.keys(value).sort() };
  return { type: value === null ? "null" : typeof value };
};

/** Fields the app reads, per endpoint (from src/features types). Missing ones = schema mismatch. */
const EXPECT = {
  "auth/me": ["userId|uid|user_id|sub", "email", "tipoUsuarioResolvido|tipoUsuario|roleSlug|role", "approvalStatus?", "permissions?", "licenciadoId?", "sublicenciadoId?"],
  "licenciados/me": ["id", "codigo_licenciado", "status", "email", "nome_completo", "telefone", "created_at?"],
  "sublicenciados/me": ["id", "codigo_sublicenciado", "status", "email", "licenciado"],
  consumidores: ["data", "meta"],
  "consumidores.item": ["id", "tipo_pessoa", "nome_completo", "razao_social", "status", "created_at", "cidade?", "uf?"],
  "consumidores/{id}": ["id", "status", "email", "vinculos_uc?"],
  "acompanhamento/cards": ["data"],
  "acompanhamento/cards.item": ["consumidorId", "clientName", "clientStatus", "metrics", "nextRecommendedActionLabel", "lastActionLabel", "clientJourney?"],
  "acompanhamento/alertas": ["data"],
  "acompanhamento/alertas.item": ["id", "tipo", "severidade", "titulo", "descricao", "consumidor_id", "recommended_action_label"],
  "comissoes/stats": ["total_valor", "total_comissoes", "por_status", "por_competencia", "total_valor_sublicenciado?", "a_receber?", "previsto_mes_atual?"],
  comissoes: ["data", "meta"],
  "comissoes.item": ["id", "competencia", "status", "consumidor_nome", "valor_comissao?", "valor_comissao_sublicenciado?", "data_geracao"],
  "pagamentos-licenciados": ["data"],
  "pagamentos-licenciados.item": ["id", "status", "valor_liquido", "valor_comissoes", "competencias", "created_at"],
  "sublicenciados/equipe": ["total", "data"],
  "sublicenciados/equipe.item": ["id", "nome_completo", "email", "status", "total_consumidores", "comissao_prevista_mes"],
  dashboard: ["summary", "alerts"],
  "notifications/summary": ["unreadCount", "latest"],
  notifications: ["items", "total", "page", "pageSize"],
  "support/tickets": ["items", "total"],
  "training/courses": [],
  "training/courses.item": ["id", "title", "totalLessons", "completedLessons", "percent", "status"],
  "training/summary": ["coursesCompleted", "coursesInProgress", "currentLevel"],
  onboarding: ["id", "status", "pendencias", "progresso_percentual", "can_submit", "submitted"],
  documentos: ["data"],
  "pedidos/me/context": ["available_points", "can_purchase"]
};

function mismatches(key, body) {
  const expected = EXPECT[key];
  if (!expected || !body || typeof body !== "object" || Array.isArray(body)) return [];
  const missing = [];
  for (const field of expected) {
    const optional = field.endsWith("?");
    const names = field.replace("?", "").split("|");
    if (!optional && !names.some((name) => name in body)) missing.push(names.join("|"));
  }
  return missing;
}

let idToken = null;

async function call(step, key, base, path, { query, auth = true, token = idToken } = {}) {
  const url = new URL(base + path);
  for (const [name, value] of Object.entries(query ?? {})) if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  const started = Date.now();
  let status = 0;
  let body = null;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", ...(auth ? { Authorization: `Bearer ${token}` } : {}) } });
    status = response.status;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { nonJson: true };
    }
  } catch (error) {
    body = { networkError: String(error?.cause?.code ?? error) };
  }
  const ok = status >= 200 && status < 300;
  const entry = {
    step,
    key,
    method: "GET",
    path: path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "{id}"),
    status,
    ms: Date.now() - started,
    shape: ok ? shape(body) : null,
    // Error bodies are backend messages (no PII) — kept to explain failures.
    error: ok ? null : typeof body?.message === "string" || Array.isArray(body?.message) ? body.message : body,
    missingFields: ok ? mismatches(key, body) : []
  };
  const list = ok ? (Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : null) : null;
  if (list?.[0]) entry.missingItemFields = mismatches(`${key}.item`, list[0]);
  results.push(entry);
  const flag = ok ? (entry.missingFields.length || entry.missingItemFields?.length ? "~" : "✔") : "✖";
  console.log(`${flag} ${String(status).padEnd(3)} ${entry.ms}ms  ${step.padEnd(22)} ${entry.path}${entry.missingFields.length ? `  missing: ${entry.missingFields.join(", ")}` : ""}${entry.missingItemFields?.length ? `  item missing: ${entry.missingItemFields.join(", ")}` : ""}`);
  return { ok, status, body, list };
}

// ---------------------------------------------------------------- 1. Authentication (Firebase + /auth/me)
const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: LIVE_EMAIL, password: LIVE_PASSWORD, returnSecureToken: true })
});
const signInBody = await signIn.json();
if (!signIn.ok) {
  console.error(`✖ Firebase sign-in failed: ${signInBody?.error?.message}`);
  process.exit(1);
}
idToken = signInBody.idToken;
console.log(`✔ Firebase sign-in (token expires in ${signInBody.expiresIn}s)`);
results.push({ step: "firebase-sign-in", status: 200, expiresIn: signInBody.expiresIn });

const refresh = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(signInBody.refreshToken)}`
});
const refreshBody = await refresh.json();
console.log(`${refresh.ok ? "✔" : "✖"} Firebase token refresh (${refresh.status})`);
results.push({ step: "firebase-refresh", status: refresh.status });
if (refresh.ok) idToken = refreshBody.id_token;

await call("auth: no token → 401", "none", AUTH, "/v1/auth/me", { auth: false });
await call("auth: bad token → 401", "none", AUTH, "/v1/auth/me", { token: "invalid.token.value" });
const me = await call("auth: me", "auth/me", AUTH, "/v1/auth/me");
if (!me.ok) {
  finish();
  process.exit(1);
}
const m = me.body;
const role = m.tipoUsuarioResolvido ?? m.tipoUsuario ?? m.roleSlug ?? m.role;
const isSub = String(role).toUpperCase().includes("SUBLICENCIADO");
console.log(`  role: ${role} · approvalStatus: ${m.approvalStatus ?? "(absent)"} · permissions: ${Array.isArray(m.permissions) ? m.permissions.length : "(absent)"}`);
results.push({ step: "role", role, approvalStatus: m.approvalStatus ?? null, permissionsCount: Array.isArray(m.permissions) ? m.permissions.length : null });
const features = m.features && typeof m.features === "object" ? m.features : null;
console.log(`  /auth/me keys: ${Object.keys(m).sort().join(", ")}`);
console.log(`  features: ${features ? JSON.stringify(features) : "(absent)"} · accountStatus: ${m.accountStatus ?? "(absent)"}`);
results.push({ step: "me-keys", keys: Object.keys(m).sort(), features, accountStatus: m.accountStatus ?? null, permissions: Array.isArray(m.permissions) ? m.permissions : null });

// ---------------------------------------------------------------- 2. Profile
const profile = isSub
  ? await call("profile", "sublicenciados/me", BUSINESS, "/v1/sublicenciados/me")
  : await call("profile", "licenciados/me", BUSINESS, "/v1/licenciados/me");
const licenciadoId = m.licenciadoId ?? (isSub ? profile.body?.licenciado?.id : profile.body?.id) ?? null;
const ownId = isSub ? (m.sublicenciadoId ?? profile.body?.id) : licenciadoId;
if (!isSub) await call("profile: contract", "none", BUSINESS, "/v1/licenciados/me/contrato");
await call("security: sessions", "none", AUTH, "/v1/auth/sessions/me");

// ---------------------------------------------------------------- 3–7. Clients
const clients = await call("clients: list", "consumidores", BUSINESS, "/v1/consumidores", { query: { page: 1, perPage: 20 } });
await call("clients: page 2", "consumidores", BUSINESS, "/v1/consumidores", { query: { page: 2, perPage: 20 } });
await call("clients: search", "consumidores", BUSINESS, "/v1/consumidores", { query: { nome: "a", page: 1, perPage: 20 } });
await call("clients: filter", "consumidores", BUSINESS, "/v1/consumidores", { query: { status: "APROVADO", page: 1, perPage: 20 } });
await call("clients: city/UF", "consumidores", BUSINESS, "/v1/consumidores", { query: { uf: "SP", page: 1, perPage: 20 } });
const firstClient = clients.list?.[0]?.id;
if (firstClient) {
  await call("clients: detail", "consumidores/{id}", BUSINESS, `/v1/consumidores/${firstClient}`);
  await call("clients: journey", "none", BUSINESS, `/v1/acompanhamento/${firstClient}`);
  await call("clients: documents", "documentos", BUSINESS, "/v1/documentos", { query: { proprietario_tipo: "CONSUMIDOR", consumidor_id: firstClient, page: 1, per_page: 50 } });
}
await call("clients: not-mine → 403/404", "none", BUSINESS, "/v1/consumidores/00000000-0000-4000-8000-000000000000");
await call("journey: board", "acompanhamento/cards", BUSINESS, "/v1/acompanhamento/cards", { query: { page: 1, perPage: 100 } });
await call("pending actions", "acompanhamento/alertas", BUSINESS, "/v1/acompanhamento/alertas");

// ---------------------------------------------------------------- 8–9. Commissions & payments
await call("commissions: summary", "comissoes/stats", BUSINESS, "/v1/comissoes/stats");
const commissions = await call("commissions: statement", "comissoes", BUSINESS, "/v1/comissoes", { query: { page: 1, perPage: 50 } });
if (commissions.list?.[0]?.id) await call("commissions: detail", "none", BUSINESS, `/v1/comissoes/${commissions.list[0].id}`);
if (isSub && commissions.list?.some((item) => "valor_comissao" in item)) {
  console.log("  ⚠ representative received valor_comissao (licenciado share)");
  results.push({ step: "commissions: sub sees licenciado share", status: "WARN" });
}
const payments = await call(isSub ? "payments (expect 403)" : "payments: list", "pagamentos-licenciados", BUSINESS, "/v1/pagamentos-licenciados", { query: { page: 1, per_page: 50 } });
if (!isSub && payments.list?.[0]?.id) await call("payments: statement", "none", BUSINESS, `/v1/pagamentos-licenciados/${payments.list[0].id}/extrato`);
const paid = !isSub ? payments.list?.find((item) => item.status === "PAGO") : null;
if (paid?.id) await call("payments: receipt", "none", BUSINESS, `/v1/pagamentos-licenciados/${paid.id}/comprovante`);

// ---------------------------------------------------------------- 10–11. Team & invitations
const team = await call(isSub ? "team (expect 403)" : "team: members", "sublicenciados/equipe", BUSINESS, "/v1/sublicenciados/equipe");
if (!isSub && team.list?.[0]?.id) await call("team: member", "none", BUSINESS, `/v1/sublicenciados/${team.list[0].id}`);
await call("invitations: list", "none", BUSINESS, "/v1/sublicenciados/convites");

// ---------------------------------------------------------------- 12–13. Onboarding & documents
if (ownId) {
  await call("onboarding: status", "onboarding", BUSINESS, isSub ? `/v1/onboarding/sublicenciado/${ownId}` : `/v1/onboarding/licenciado/${ownId}`);
  const ownDocs = await call(
    "documents: mine",
    "documentos",
    BUSINESS,
    "/v1/documentos",
    { query: isSub ? { proprietario_tipo: "SUBLICENCIADO", sublicenciado_id: ownId, page: 1, per_page: 50 } : { proprietario_tipo: "LICENCIADO", licenciado_id: ownId, page: 1, per_page: 50 } }
  );
  if (ownDocs.list?.[0]?.id) await call("documents: signed url", "none", BUSINESS, `/v1/documentos/${ownDocs.list[0].id}/signed-url`);
}
if (licenciadoId) await call("dashboard", "dashboard", BUSINESS, `/v1/dashboards/licenciado-central/${licenciadoId}`);

// ---------------------------------------------------------------- 14–17. Support, Academy, Notifications, Marketplace
await call("support: tickets", "support/tickets", BUSINESS, "/v1/support/tickets", { query: { page: 1, pageSize: 20 } });
await call("academy: courses", "training/courses", BUSINESS, "/v1/training/courses");
await call("academy: summary", "training/summary", BUSINESS, "/v1/training/summary");
await call("notifications: summary", "notifications/summary", BUSINESS, "/v1/notifications/me/summary");
await call("notifications: list", "notifications", BUSINESS, "/v1/notifications/me", { query: { page: 1, pageSize: 20, onlyUnread: "false" } });
await call("marketplace: context", "pedidos/me/context", BUSINESS, "/v1/pedidos/me/context");
await call("marketplace: products", "none", BUSINESS, "/v1/produtos", { query: { tipo_publico: "LICENCIADO", ativo: true, page: 1, per_page: 100 } });
await call("marketplace: orders", "none", BUSINESS, "/v1/pedidos", { query: { page: 1, per_page: 100 } });
await call("app status", "none", BUSINESS, "/v1/app/status", { auth: false });
await call("settings: notification prefs", "none", BUSINESS, "/v1/licenciado-settings/me/notification-preferences");
await call("settings: preferences", "none", BUSINESS, "/v1/licenciado-settings/me/preferences");
await call("support: whatsapp number", "none", BUSINESS, "/v1/client-configuracoes/whatsapp-atendimento");

finish();

function finish() {
  mkdirSync("validation-results", { recursive: true });
  const file = `validation-results/${label}.json`;
  writeFileSync(file, JSON.stringify({ label, at: new Date().toISOString(), results }, null, 2));
  console.log(`\nSaved ${file} (field names and statuses only)`);
}
