# Live API Validation — ACVEL Licenciado app

**Scope rule (2026-10-06):** The client confirmed that mobile apps must provide parity with the normal user-facing production portals. Only ADM/internal operator functionality is excluded. (Section 0; this replaces the earlier consult-only rule.)

**Portal parity (2026-10-06, after implementation):** section 12 — weighted parity ≈ 93 % (60 features), up from ≈ 56 %. Demo readiness ≈ 92 %.

**Communication parity audit (2026-10-12):** section 15 — 111 text replacements + 2 portal label maps in 37 files; mobile wording now follows the licenciado portal ("ticket", portal status names, no raw enums).

**Final demo preparation (2026-10-08):** section 14 — display fixes, URL configuration (consumer test portal), fresh demo APK `acvel-licenciado-homolog-demo-0.1.0-1-arm64-20261008.apk`, remaining backend dependencies. Demo readiness ≈ 87 %.

**Homologation validation with backend test data (2026-10-08):** section 13 — 4 accounts (approved licenciado `LIC-663394`, approved representative, pending representative, pending licenciado), login + GET only, 0 writes. Data confirmed for dashboard, kWh, client, commissions/payment/receipt, academy, support, WhatsApp and pending onboarding. Blockers: document preview (backend link needs a token), marketplace flag, receipt path; 3 small display issues.

**Status: live read-only validation done for the licenciado role (last run 2026-10-06: 38 GET, 0 writes).**

With the client's test account:
- `/v1/auth/me` works and the account routes as an **approved licenciado**.
- **33 of 38 read-only calls succeed.** The other five are expected: the two 401 checks (no token / bad token),
  the not-mine client probe (404), invitations (400 → "no invitations") and app status (404 → "no maintenance").
- Clients (incl. city/UF filter and client documents), journey, pending actions, dashboard, onboarding, own
  documents + signed URL, notifications, notification preferences, preferences and the WhatsApp setting were
  checked with real data.
- Commissions, payments, team, support, academy and marketplace returned empty lists, so only their empty
  states were checked.
- The restored portal **writes** (registration, onboarding, uploads, profile edit, preferences, orders, alert
  actions, ticket from client) are implemented and unit-tested against the live Swagger, but **were not run
  live** — live validation stays read-only until a specific write test is approved.

**Still open:**
- A representative account and a pending account.
- Sample data for the empty modules (section 12.5).
- The backend gaps in section 12.4 B.
- An on-device run on a physical phone (section 10).

**Legend:** ✅ validated · ⚠️ works with a caveat · ❌ fails / missing · ⏳ not validated yet (needs credentials)

---

## 0. Scope rule (2026-10-06)

> **The client confirmed that mobile apps must provide parity with the normal user-facing production portals.
> Only ADM/internal operator functionality is excluded.**

The earlier consult-only interpretation (2026-10-03) is **superseded**. A feature is not excluded because it
writes data; it is excluded only when it is an ADM/internal operator function.

**Still excluded (ADM / internal):**
- Approving or rejecting licenciados, representatives, documents or clients (`…/aprovar`, `…/reprovar`).
- Generating or changing financial records: commissions, payment batches, invoices, boletos, Pix. The app only
  reads them (backend values are authoritative; nothing financial is calculated in the app).
- Rateio: completely unused (no call targets `EXPO_PUBLIC_RATEIO_API_URL`).
- System configuration, admin roles, operator back-office screens.

**Enforced by `src/features/__tests__/parity-scope.test.ts`** (replaces `consult-only.test.ts`):
- every `post/put/patch/delete` in a feature service must be in the allowlist of normal-user portal actions
  (0.1);
- no service may reference ADM endpoints (`/aprovar`, `/reprovar`, `/admin`, `/v1/lotes`, `/v1/configuracoes`,
  commission generation);
- no write may target `/v1/comissoes`, `/v1/pagamentos-licenciados` or `/v1/faturas`;
- no service may target the rateio backend.

### 0.1 Normal-user writes (allowlist)

| Portal action | Endpoint(s) | Mobile |
|---|---|---|
| Register (licenciado / representative by code or invite) | `POST {AUTH}/v1/auth/register-licenciado`, `register-sublicenciado`, `POST /v1/sublicenciados/validate-codigo`, `POST /v1/convites/validar` | Welcome → Quero ser Licenciado / Recebi um convite (code can be typed) |
| First access | `POST /v1/licenciados/bootstrap-me`, `POST /v1/sublicenciados/bootstrap-me` | "Iniciar cadastro" |
| Onboarding wizard | `POST /v1/onboarding/iniciar`, `iniciar-sublicenciado`, `validate-uniqueness`, `PUT …/etapas/dados-pessoais` · `dados-profissionais` · `dados-bancarios` · `documentos` · `termos` · `conferencia-empresa` · `dados-login`, `POST …/submit` | Seu cadastro → Iniciar / Continuar cadastro (licenciado 5 steps, representative 6 steps) |
| Own document upload / re-send | `POST /v1/documentos/presign-upload`, `PUT {upload_url}`, `POST /v1/documentos/confirm-upload`, `POST /v1/documentos/{id}/reenviar` | Wizard "Documentos" step; Mais → Documentos ("Reenviar" on rejected) |
| Profile edit (licenciado) | `PUT {AUTH}/v1/auth/profile`, `PATCH /v1/licenciados/{id}` | Mais → Meus dados → Editar |
| Own settings | `PUT /v1/licenciado-settings/me/notification-preferences`, `PUT /v1/licenciado-settings/me/preferences` | Mais → Preferências de notificação; Mais → Preferências |
| Dashboard alert actions | `POST /v1/dashboards/licenciado-central/{id}/alerts/{alertId}/read`, `…/resolve` | Início → alertas → Marcar como lido / Resolver |
| Marketplace order / cancel | `POST /v1/pedidos` (Idempotency-Key), `POST /v1/pedidos/{id}/cancel` | Marketplace → Resgatar (confirmation) / tap a pending order → Cancelar (server flag required) |
| Support | `POST /v1/support/tickets`, `POST …/{id}/messages`, `PATCH …/{id}/status` | Suporte; Cliente → "Abrir ticket de suporte" |
| Lesson completion | `POST /v1/training/courses/{id}/lessons/{lessonId}/complete` | Academy |
| Notification read state | `POST /v1/notifications/me/{id}/read`, `POST /v1/notifications/me/read-all` | Notificações |
| Sessions / account | `DELETE /v1/auth/sessions/me/{id}`, `DELETE /v1/auth/sessions/me`, `POST /v1/auth/account/delete-request`; password change/reset via Firebase | Segurança |

**Consent and legal rules kept:** terms are accepted only by an explicit checkbox plus a typed full-name
signature (`saveTerms` refuses otherwise); LGPD consents and marketing opt-in are shown as **off** unless the
backend returns an explicit `true` (the portal defaults missing consents to `true`; the app does not); the
contract is never signed automatically (ZapSign link only).

### 0.2 Reads (unchanged)

Auth/session, profile, contract, dashboard, clients (+ city/UF filters, documents), journey, pending actions,
commissions/payments (+ statement, receipt), team (+ member documents), onboarding status, own documents,
support, academy, notifications, settings, WhatsApp support number, marketplace and app status. The four
live-mapping fixes stay (permission objects, unsupported-invitation fallback, UC label chain, numeric-string
points).

---

## 1. Target environment

| Service | Base URL (`.env`) | Health | Swagger |
|---|---|---|---|
| Auth | `https://api-acvel.souaiv.com/api/auth` | ✅ `GET /health` → 200, database connected | ❌ not published (`/docs`, `/docs-json` → 404) |
| Business | `https://api-acvel.souaiv.com/api/business` | ✅ 200, database connected | ✅ `/docs-json`: 339 operations, saved as `docs/openapi/acvel-business-live.json` |
| Rateio | `https://api-acvel.souaiv.com/api/rateio` (homologation; `api.appacvel.com.br/api/rateio` also answers) | ✅ 200, database + redis connected on both hosts | ✅ `/docs-json`: 327 operations, saved as `docs/openapi/acvel-rateio-live.json` |

- `EXPO_PUBLIC_USE_MOCKS=false`.
- The live services are NestJS. The gateway maps `{BUSINESS_URL}/v1/x` to the service path `/api/v1/x`, so the app's paths need no change.
- Refresh the saved specs with `npm run openapi:pull`.

**Finding — this is not licenciado-api.** The live backend is the original ACVEL API. The app's legacy-inventory contracts match it. The licenciado-api-only endpoints (token invitations, `PATCH …/me`, app status) do not exist on it. Section 7 lists how the app handles each of these.

---

## 2. Firebase configuration

| Item | Status |
|---|---|
| Android package / iOS bundle id `com.acvel.app` | ✅ set in `app.config.ts` (was `br.com.acvel.licenciado`); `expo config` resolves both |
| Native files wired | ✅ `ios.googleServicesFile` / `android.googleServicesFile` point to `firebase/…` when present. The files are git-ignored. EAS production builds refuse to run without them |
| File validation | ✅ `npm run firebase:check` checks that both files parse, that the package/bundle id is `com.acvel.app`, and that both platforms use the same project. It prints the `EXPO_PUBLIC_FIREBASE_*` values; `--write-env` writes them to `.env` |
| Client files present | ✅ received and validated: `BUNDLE_ID` and `package_name` = `com.acvel.app`, the same project on both platforms. `EXPO_PUBLIC_FIREBASE_*` written to `.env` |
| Firebase project | ✅ **`teste---00`** is accepted by the live backend. A real ID token gets past token verification (a malformed token gets `Token invalido ou expirado` instead); the failure comes later, at the user lookup (section 4.1) |
| API key and sign-in method | ✅ `accounts:signInWithPassword` with an unknown e-mail returns `INVALID_LOGIN_CREDENTIALS`: the key is valid and Email/Password sign-in is enabled |
| Embedded in the Android build | ✅ `google-services.json` copied to `android/app`, and the `com.google.gms.google-services` plugin applied |
| Initialization (JS SDK, `initializeAuth`) | ⏳ device run (config values are present in the release bundle) |
| Persistence (AsyncStorage) | ⏳ device run |
| Token retrieval / refresh | ✅ live run: email/password sign-in → ID token (3600 s); refresh-token exchange → new ID token, which the backend verifies |
| Logout | ⏳ device run |

**Why the native files and the env values both matter:**
- Authentication runs on the Firebase JS SDK, which reads `EXPO_PUBLIC_FIREBASE_*`. Those values are derived from the native files.
- The native files are embedded in the build for native Firebase services (FCM push, when added).

---

## 3. Unauthenticated checks (done)

| Check | Result |
|---|---|
| `GET {AUTH}/v1/auth/me` with no token | ✅ 401 `{"message":"Token nao fornecido"}` → the app signs out / stays on Login |
| `GET {BUSINESS}/v1/licenciados/me` with no token | ✅ 401 |
| `POST {AUTH}/v1/auth/register-licenciado` `{}` | ✅ 400 with a list of validation messages (policy: ≥ 8 chars, upper, lower, digit, special) |
| `POST {AUTH}/v1/auth/register-sublicenciado` `{}` | ⚠️ 400. Requires **`codigo_licenciado`**, not an invitation token. App adapted (section 7) |
| `POST {BUSINESS}/v1/sublicenciados/validate-codigo` `{}` | ✅ 400 (public endpoint exists) |
| `GET {BUSINESS}/v1/app/status` | ❌ 404. The app treats this as "not in maintenance" (by design) |
| `POST {BUSINESS}/v1/convites/validar` | ❌ 404. Token invitations are not on the live API |
| `{AUTH}/v1/auth/sessions/me`, `/account/delete-request`, `/change-password`, `/profile` | ✅ routes exist (401 without a token) |

**Error format finding:**
- Live validation errors are `{ "message": string[], "error": "Bad Request", "statusCode": 400 }`.
- The app used to show a generic message for these. It now joins the array, and never shows the English reason phrase from `error`. Covered by tests.

---

## 4. Auth + role routing

`npm run validate:live -- --label <account>` runs these checks per account. Credentials come from the
git-ignored `validation-results/accounts.env`. Only statuses, field names, counts and enum values are recorded,
never values, tokens or PII.

### 4.1 First account — not provisioned (2026-10-01)

For `master.licenciado@acvel.com.br`:
- Firebase login works.
- Every authenticated call returns `401 Usuario nao encontrado no sistema`: the user has no record in the
  backend.
- Backend fix recommended: answer "valid token, unknown user" with **403 + a code**, not 401. Otherwise the app
  can only sign out silently (section 6.2).

### 4.2 Client test account — licenciado with data (2026-10-02)

| # | Check | Endpoint | HTTP | Result |
|---|---|---|---|---|
| 1 | Firebase login | `identitytoolkit … signInWithPassword` | 200 | ✅ ID token (3600 s). Refresh token → 200, new ID token accepted by the backend. Project `teste---00`, provider `password`, no custom claims, `email_verified: false` |
| — | No token / malformed token | `GET {AUTH}/v1/auth/me` | 401 / 401 | ✅ `Token nao fornecido` / `Token invalido ou expirado` |
| 2 | Current user | `GET {AUTH}/v1/auth/me` | 200 | ✅ fields: `userId`, `uid`, `email`, `displayName`, `role`, `roleSlug`, `roles[3]`, `tipoUsuario`, `tipoUsuarioResolvido`, `status`, `permissions[53]`, `onboarding_completed`, `territory`, `territorial_scopes`, `emailVerified`, `createdAt`, `lastLogin` |
| 3 | Role detection | — | — | ✅ `tipoUsuarioResolvido=LICENCIADO`, `roleSlug=licenciado_master`. `roles`: `licenciado_master`, `consumidor_basico`, `gerador`. The app uses `tipoUsuarioResolvido` first, so the extra roles don't confuse it |
| 4 | Approval state | `GET /v1/licenciados/me` | 200 | ✅ `/auth/me` has **no** `approvalStatus`, `licenciadoId`, `accountStatus` or `features`. The app's fallback derives them from the business record: `status=APROVADO` → **APPROVED**, `id` → `licenciadoId`. User-level `status=ACTIVE` is not used yet (section 6.2) |
| 5 | Permission routing | — | — | ✅ **fixed.** Live `permissions` are objects `{resource, action, scope, level}`, mapped by `normalizePermissions` (`src/features/auth/permissions.ts`). The 53 live entries → **12 app permissions**: `clients:read/write`, `commissions:read`, `payments:read`, `team:read/invite`, `support:use`, `notifications:read`, `profile:read/update`, `onboarding:self`, `marketplace:use`. The mapping is strict: an unmapped or missing permission grants nothing. **No `training:use`**: the live API has no training resource, so Academy stays hidden for this licenciado |

Representative and pending accounts: ⏳ no credentials yet. So "a representative cannot reach licenciado-only
data" is still unverified on the live API.

---

## 5. Module validation (live, licenciado account, read-only)

Every call is a GET; no data was written. **Schema** = the fields the app reads are present with compatible
types. **Sample data** = whether this account has records to exercise the screen.

| # | Module | Endpoint | HTTP | Schema | Permission | Mapping issues | Sample data | Backend gaps |
|---|---|---|---|---|---|---|---|---|
| 6 | Profile | `GET /v1/licenciados/me` | 200 | ✅ `id`, `codigo_licenciado`, `codigo_cupom` (null), `status`, `tipo_pessoa`, name/contact fields, `created_at` | ✅ own record | none | ✅ full record (PJ, APROVADO) | Payload includes full CPF/CNPJ, bank account and terms IP/user agent; a general profile call should mask these |
| 6 | Contract | `GET /v1/licenciados/me/contrato` | 200 | ✅ (`null` body = no contract) | ✅ | none | ❌ no contract, although the account is APROVADO with terms accepted (`termos_versao v1`) | — |
| 6 | Sessions | `GET {AUTH}/v1/auth/sessions/me` | 200 | ✅ `data[6]`: `id`, `deviceLabel`, `lastSeenAt`, `isCurrent`, `locationHint` (+ snake_case duplicates) | ✅ | none | ✅ 6 sessions | Also returns `ip_address`/`user_agent` (fine for the owner) |
| 6 | Preferences | `GET /v1/licenciado-settings/me/preferences` | 200 | n/a (not used by the app yet) | ✅ | — | ✅ | — |
| 7 | Dashboard | `GET /v1/dashboards/licenciado-central/{licenciadoId}` | 200 | ✅ `summary.total_clientes`, `clientes_ativos`, `ucs_em_ativacao`, `comissao_prevista_mes`; `alerts[20]` with `id`, `type`, `description`, `entityType`, `entityId`, `read_at`, `resolved_at` | ✅ (id from `/licenciados/me`) | none. Extra `comissao_a_receber {licenciado, sublicenciados, total}`, `competencia_atual` and `charts` are available for later | ✅ 20 alerts (`DOCUMENTO_PENDENTE`), 3 months of client chart; commission chart empty | The path still carries the licenciado id; the backend must keep verifying it against the token |
| 8 | Clients | `GET /v1/consumidores?page&perPage` | 200 | ✅ `data[]` + `meta {total, page, perPage, totalPages}`. Item has `nome_completo`, `razao_social`, `tipo_pessoa`, `status`, `status_label`, `cidade`, `uf`, `created_at` | ✅ own clients only | none | ✅ **87 clients** (all APROVADO) | — |
| 8 | Pagination | page 1 / page 2 (`perPage=20`) | 200 | ✅ 20 + 20 of 87, **no overlap** | | | | |
| 8 | Search | `?nome=<term>` | 200 | ✅ results all contain the term | | | | |
| 8 | Filters | `?status=APROVADO` / `PENDENTE_APROVACAO` / `INATIVO` | 200 | ✅ 87 / 0 / 0, all matching | | | ⚠️ no pending or inactive clients, so the "Em cadastro" / "Inativos" chips show empty states | |
| 9 | Client details | `GET /v1/consumidores/{id}` | 200 | ✅ main fields; `vinculos_uc[]` items are `{id, consumidor_id, uc_id, ativo, data_inicio, data_fim, created_at, updated_at}`. `uc_id` is an internal UUID; no `uc_numero`/`numero`/`uc{}` | ✅ own client. Unknown id → 404 `Consumidor … nao encontrado` (no data leaked) | ✅ **fixed (rev. 2026-10-05):** `uc_numero` → `numero` → the journey `ucsPreview[].ucNumber` matched by `uc_id` → "Unidade consumidora". Live: 22 of 22 links show the real UC number; the UUID is never shown | ✅ UC links present | The UC number should come in `vinculos_uc` itself (today it comes from the journey call) |
| 10 | Client journey | `GET /v1/acompanhamento/{id}` | 200 | ✅ all card fields; `clientJourney[5]` `{key, label, state, detail}` (no `date`, optional in the app) | ✅ | none | ✅ states `DONE`/`SKIPPED`; stage `AGUARDANDO_CONCESSIONARIA` | `invoices[]` empty |
| 10 | Journey board | `GET /v1/acompanhamento/cards?page=1&perPage=100` | 200 | ✅ `data[87]` + `meta` | ✅ | `clientStatus` values `UC_AGUARDANDO_COMPENSACAO`, `INADIMPLENTE`, `COMPENSANDO_NORMAL`, `APROVADO_AGUARDANDO_UC`: all have app labels | ✅ 87 cards, 4 stages | Hard limit of 100 per page in the app; the live API has `meta.totalPages`, so pagination can be added when a tenant exceeds 100 |
| 10 | Pending actions | `GET /v1/acompanhamento/alertas` | 200 | ✅ `data[63]`: `id`, `tipo`, `severidade`, `titulo`, `descricao`, `consumidor_id`, `recommended_action_label` | ✅ | none (`INFO`/`WARNING`/`CRITICAL` mapped) | ✅ 63 alerts | — |
| 11 | Commissions summary | `GET /v1/comissoes/stats` | 200 | ✅ `total_valor` (number), `total_comissoes`, `por_status[]`, `por_competencia[]`, + `valor_medio` | ✅ | none. `a_receber`, `previsto_mes_atual` and `pago_ultimos_12_meses` are absent (the app hides them); the dashboard's `comissao_a_receber` could fill "A receber" later | ❌ **0 commissions** | Statement rows, detail and eligibility can't be validated without data |
| 11 | Statement | `GET /v1/comissoes?page&perPage` | 200 | ✅ envelope `data` + `meta {total, total_gerada, total_paga}` | ✅ | — | ❌ empty | Commission detail `GET /v1/comissoes/{id}` not exercised (no record) |
| 12 | Payments | `GET /v1/pagamentos-licenciados?page&per_page` | 200 | ✅ envelope `data` + `meta {total, per_page, total_pages}` | ✅ licenciado allowed | — | ❌ empty | Statement `/{id}/extrato` not exercised (no record) |
| 13 | Team | `GET /v1/sublicenciados/equipe` | 200 | ✅ `{data, total}` | ✅ | — | ❌ **no representatives** (`/pendentes` also empty) | Member detail not exercised |
| 13 | Invitations | `GET /v1/sublicenciados/convites` | **400** `Validation failed (uuid is expected)` | — | — | ✅ **fixed (rev. 2026-10-05):** 404 or any 400 from this list endpoint → "no invitations" (empty state). 5xx, 401/403 and network errors surface (tested). Inviting = sharing the code link (QR + copy + share; the live API has no invitation write routes) | — | The endpoint should return 404 or an empty list, not 400 |
| 14 | Onboarding status | `GET /v1/onboarding/licenciado/{licenciadoId}` | 200 | ✅ `status`, `etapa_atual`, `etapas_concluidas[5]`, `pendencias[]`, `progresso_percentual`, `can_submit`, `submitted`, `submitted_at`, `reprovado_motivo` (+ `etapas[{nome, concluida}]`) | ✅ | none | ✅ fully approved (`APROVADO`, 5/5 steps) | Pending/rejected onboarding not covered (needs a pending account) |
| 15 | Documents | `GET /v1/documentos?proprietario_tipo=LICENCIADO&licenciado_id=…` | 200 | ✅ `data[2]`: `id`, `tipo`, `status_validacao`, `arquivo_nome`, `reprovado_motivo`, `created_at` (+ path, size, MIME, checksum) | ✅ | none | ✅ 2 documents, both APROVADO. Client documents for the first client: 0 | Returns the internal `arquivo_path` (storage key) to the app; it should not be exposed |
| 16 | Support | `GET /v1/support/tickets?page&pageSize` | 200 | ✅ `{items, total, page, pageSize}` | ✅ | — | ❌ no tickets (messages not exercised) | `GET /v1/client-configuracoes/whatsapp-atendimento` → `phoneE164: null` (no WhatsApp number configured) |
| 17 | Academy | `GET /v1/training/courses`, `/v1/training/summary` | 200 / 200 | ✅ bare array; summary `coursesCompleted`, `coursesInProgress`, `studiedHours`, `currentLevel`, `byCourse[]` | ✅ | none | ❌ **0 courses** (level `Iniciante`) | Lessons and completion not exercised; no catalog published |
| 18 | Notifications | `GET /v1/notifications/me/summary`, `/v1/notifications/me` | 200 / 200 | ✅ `unreadCount`, `latest[2]`; list `{items[2], total, page, pageSize}`; item `id`, `createdAt`, `title`, `message`, `type`, `severity`, `readAt`, `entityType`, `entityId`, `actionLabel`, `actionHref` | ✅ | none. `entityType=CLIENTE` → the app opens the client screen; `actionHref` is only used when it is a relative path | ✅ 2 unread (`CLIENTE_FATURA_ENVIADA`, `CLIENTE_CADASTRO_FINALIZADO`) | Read/read-all are writes (not run) |
| 19 | Marketplace flag | `/v1/auth/me` → `features.marketplace` | — | ❌ no `features` object | — | The app hides Marketplace (fails closed), as designed | — | **No feature flag on the backend.** The app needs `features.marketplace` (or similar) in `/auth/me` |
| 19 | Marketplace data | `GET /v1/pedidos/me/context`, `/v1/produtos`, `/v1/pedidos` | 200 ×3 | ✅ context: `available_points`, `reserved_points`, `total_points` are **numeric strings**, plus `carteira{…}`, `actor_mode=CONSUMIDOR`, `default_consumidor_id` | ✅ (`marketplace:use` granted) | ✅ **fixed:** `toPoints()` converts finite numbers and plain numeric strings (`"1200"` → 1200, `"0"` → 0). Anything else becomes `null` (shown as "—", never 0). Applied to context, product price and order points | ❌ 0 products, 0 orders | No feature flag, so the screen stays hidden. `actor_mode=CONSUMIDOR` for a licenciado: confirm intent |
| — | App status | `GET /v1/app/status` | 404 | — | — | handled (no maintenance) | — | Endpoint missing (known) |

**Summary for this account:**
- **31 of 33 calls succeeded.** The two that didn't are expected: invitations (400) and app status (404).
- **Validated with real data:** auth, profile, dashboard, clients (list, pagination, search, filter, detail),
  journey, pending actions, onboarding, documents, notifications.
- **Validated only as empty states:** commissions, payments, team, support, academy, marketplace catalogue.

---

## 6. Schema mismatches

### 6.1 Request bodies (from the live Swagger)

> **Rev. 2026-10-06 (parity rule, section 0):** document upload, profile update, registration and bootstrap are back in the app and follow these live bodies. Create client stays out (the portal form is orphaned, see 12.2).


Most live responses are undocumented in the Swagger (`responses` without a schema), so response fields can only be confirmed with a real token. `validate:live` reports every missing field. Request bodies are documented:

| Endpoint | Live contract | App | Impact / action |
|---|---|---|---|
| `POST /v1/consumidores` | **requires** `user_id`, `licenciado_id`, `cep`, `logradouro`, `numero`, `bairro`, `cidade`, `uf` | sends name, document, e-mail and phone only | ❌ 400. **Backend decision needed.** Requiring client-supplied `user_id`/`licenciado_id` contradicts "ids come from the token". The web portal fills a random UUID and the placeholder address `"A PREENCHER"`. The app will not fabricate these. Recommendation: derive the ids from the token and make the address optional for step 1 |
| `POST /v1/documentos/presign-upload`, `confirm-upload`, `{id}/reenviar` | **requires** `arquivo_checksum` | did not send it | ✅ fixed: real SHA-256 of the file bytes (`expo-crypto`) |
| `POST /v1/sublicenciados/bootstrap-me` | **requires** `codigo_licenciado` | sent no body | ✅ fixed: the code used at signup is kept until first access, and the backend validates it |
| `POST {AUTH}/v1/auth/register-sublicenciado` | `codigo_licenciado` | sent `convite` | ✅ fixed: `?codigo=` links use `validate-codigo` + `codigo_licenciado`; `?convite=` still supported |
| Profile update | `PATCH /v1/licenciados/{id}` (admin-style DTO, 40+ fields) | `PATCH /v1/licenciados/me` | ✅ fixed: sends `nome_completo`, `telefone`, `celular` only, with the id from `/v1/auth/me`, then re-reads `/me` |
| `GET /v1/consumidores` status filter | `PENDENTE_APROVACAO|APROVADO|REPROVADO|SUSPENSO|INATIVO|BLOQUEADO` | uses 3 of them | ✅ compatible |
| `GET /v1/consumidores` item | `ConsumidorResponseDto` has no `cidade`/`uf` | shows city when present | ✅ degrades (city hidden) |
| `GET /v1/comissoes` item | includes `valor_comissao` for every caller | representative UI shows only its own share | ⚠️ backend should omit the licenciado share for representatives; verify with a representative account |

---

### 6.2 Mapping issues found in the live run (app side) — fixed 2026-10-02

Service/mapping layer only: no UI redesign, no backend change. Covered by `src/features/__tests__/live-mapping.test.ts` (34 tests, built from the real live shapes).

| Severity | Issue | Live data | Fix (status) |
|---|---|---|---|
| 🔴 Critical | Permission format | `permissions: [{resource:"consumidor", action:"READ", scope:"OWN", level:"OWN"}, …]` (53 entries, with duplicates) | ✅ `normalizePermissions` accepts legacy strings **and** live objects through an explicit `resource:ACTION` map: `licenciado:READ/UPDATE` → `profile:read/update`, `onboarding:READ` → `onboarding:self`, `sublicenciado:READ/CREATE` → `team:read/invite`, `consumidor:READ/CREATE` → `clients:read/write`, `comissao:READ` → `commissions:read`, `pagamento:READ` → `payments:read`, `marketplace:READ` → `marketplace:use`, `suporte:READ` → `support:use`, `notificacao:READ` → `notifications:read`. Unknown entries grant nothing. A present-but-empty list grants nothing; only a **missing** list falls back to role defaults (legacy services) |
| 🟠 High | Invitations no-invitations handling | `GET /v1/sublicenciados/convites` → 400 | ✅ revised 2026-10-05: **404 or any 400** from the list endpoint → "no invitations" (empty state); 5xx, 401/403 and network errors surface (section 6.5) |
| 🟡 Medium | UC number in client details | `vinculos_uc[]` = `{uc_id (UUID), ativo}`, no `uc_numero`/`numero` | ✅ revised 2026-10-05: `uc_numero` → `numero` → journey `ucsPreview[].ucNumber` (matched by `uc_id`) → "Unidade consumidora". The UUID is never shown (section 6.5) |
| 🟡 Medium | Marketplace points are strings | `available_points: "<numeric string>"` | ✅ `toPoints`: numeric strings → number; invalid → `null` ("—"), never 0. Also applied to purchase counts, product price and order points |
| 🟢 Low | `/auth/me` has no approval fields | approval comes from `/licenciados/me` (`status`) | unchanged: works via the fallback (2 calls at startup). User-level `status` (`ACTIVE`) is not used yet |
| 🟢 Low | 401 for "valid token, unknown user" | `401 Usuario nao encontrado no sistema` | unchanged: backend should return 403 + code |

**Live result after the fixes** (app mappers run on the live responses of the licenciado test account):

| Check | Result |
|---|---|
| Permission routing | ✅ 12 app permissions from 53 live entries |
| Clients | ✅ visible; "Novo cliente" and "Enviar link" visible (`clients:write`) |
| Commissions | ✅ visible; "Pagamentos" segment visible (`payments:read`) |
| Team | ✅ tab visible; "Convidar" visible (`team:invite`) |
| Academy | ⚠️ **hidden.** No live training permission; the mapping stays strict. Backend: add a training resource (e.g. `treinamento:READ`) or confirm training is open to all approved users |
| Support | ✅ visible (Mais → Suporte) |
| Notifications | ✅ visible (Mais + bell unread count) |
| Profile | ✅ visible and editable (`profile:update`) |
| Invitation handling | ✅ live 400 → "no invitations" (empty state). Inviting = sharing the code link |
| UC detail | ✅ live: 22 of 22 UC links show the real UC number (from the journey `ucsPreview`), 0 neutral labels, never the UUID |
| Marketplace points | ✅ live numeric string → number. The screen stays hidden until `features.marketplace` exists |

### 6.3 Backend gaps confirmed with live data

- No feature flags in `/v1/auth/me`, so the marketplace can't be switched on for the app.
- No contract for an approved licenciado (`/licenciados/me/contrato` → null).
- `/v1/licenciados/me` returns full CPF/CNPJ, bank data and terms IP/user agent.
- `/v1/documentos` returns internal storage paths (`arquivo_path`).
- Client detail lacks UC number and distributor.
- No WhatsApp support number configured (`phoneE164: null`).
- No published Academy courses.
- `actor_mode=CONSUMIDOR` in the marketplace context for a licenciado: intended?
- `email_verified` is false for real accounts. The app doesn't require it, but the backend may want to.

### 6.4 Sample data still needed

| To validate | Needed in the test tenant |
|---|---|
| Commission statement, detail, eligibility; payment statement | Commissions and at least one payment batch for this licenciado |
| Team member detail, representative permissions (403s, no licenciado share) | A representative linked to this licenciado + its credentials |
| Pending onboarding, rejected documents, re-upload | A pending licenciado and/or representative account |
| Clients "Em cadastro" / "Inativos" filters | Clients in `PENDENTE_APROVACAO` / `INATIVO` |
| Support conversation | One existing ticket (or approval to create one) |
| Academy lessons and completion | Published courses |
| Marketplace catalogue and orders | Active products + the `features.marketplace` flag |

---

### 6.5 Mapping-fix revision (2026-10-05)

Service/mapping layer only. There are no new features, no UI redesign, and no change to authentication or API
URLs. The earlier audit fixes are unchanged (the scope rule in section 0 was revised on 2026-10-06).

| # | Fix | Before | Now |
|---|---|---|---|
| 1 | **Permissions**: legacy strings + live objects `{resource, action, scope}` | Already in place (2026-10-02). Unchanged | Strict: only explicit `resource:ACTION` pairs grant access; unknown or malformed entries grant nothing. Tests cover both formats |
| 2 | **UC number** in client details | `uc_numero` → "Unidade consumidora" | `uc_numero` → `numero` → journey `ucsPreview[].ucNumber` matched by `uc_id` → "Unidade consumidora". On the live API `uc_id` is an **internal UUID** and `uc_numero`/`numero` are null, so displaying `uc_id` would show a database id. The real 15-digit number comes from the journey response, which the detail screen already loads (same query, deduplicated: **no new request**). The UUID is never displayed |
| 3 | **Invitations** list | No invitations only on 404 or the exact live 400 message | No invitations (empty state) on **404 or any 400** from `GET /v1/sublicenciados/convites`. 5xx, 401/403 and network errors still surface |
| 4 | **Points** normalization | Already in place. Unchanged | `"1500"` → 1500, numbers kept, `null`/`undefined`/non-numeric → `null` (shown as "—", never 0). Test for `"1500"` added |

**Live check (read-only):**
- First 20 clients: **22 of 22** UC links resolve to their real UC number through the journey match.
- 0 use the neutral label, and 0 show the UUID.
- The invitations endpoint still answers 400, which the app now maps to "no invitations".

**Files changed:**
- `src/features/clients/types.ts`: `numero` on `ClientUcLink`; `ucsPreview` on `ClientJourneyCard`.
- `src/features/clients/client.service.ts`: `ucLinkNumber()`; `ucLinkLabel(link, journeyUcs)`.
- `src/app/(app)/(tabs)/clients/[clientId].tsx`: passes the already-loaded journey `ucsPreview` to the label
  (no visual change).
- `src/features/team/team.service.ts`: `isNoInvitationsResponse()` (404 or any 400 on the list endpoint).
- `src/features/__tests__/live-mapping.test.ts`: UC tests (full object, partial `numero`, only `uc_id`
  with and without a journey match, blank values); invitation tests (400 / 404 / 500 / 401 / 403 / network);
  points `"1500"`.
- `package.json`: `test:live` alias for `validate:live` (tooling only).

**Test results (2026-10-05):**

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 160 / 160 (12 suites, including the scope guard and the live contract test; see 12.8 for the current run) |
| `npm run test:live` (= `validate:live`, read-only) | ✅ 32 backend requests, **all GET, 0 writes**. Expected non-2xx only: 401 ×2 (no or bad token), 404 (another tenant's client), 400 (invitations → empty state), 404 (app status) |

**Remaining backend/data dependencies:**
- **Backend fields**
  - `vinculos_uc` should carry the UC number. Today the app depends on the journey call for it.
  - Feature flag `features.marketplace` in `/v1/auth/me`.
  - A training permission (Academy is hidden for the licenciado).
- **Backend behaviour**
  - The invitations endpoint answers 400 instead of 404 or an empty list.
  - 401 instead of 403 for "valid token, unknown user".
- **Missing endpoints:** `GET /v1/app/status`; push device-token registration.
- **Test data still needed:** commissions and payments; a representative account; a pending account; courses;
  products.

---

## 7. Backend missing features (live) and app behaviour

| Missing on the live API | App behaviour |
|---|---|
| Token invitations (`/v1/sublicenciados/convites*`, `/v1/convites/validar`) | Detected at runtime (404). The Team screen hides the invitation list, and "Convidar" shares the portal's code link `{EXPO_PUBLIC_LICENCIADO_WEB_URL}/auth/register/sublicenciado?codigo=<codigo_licenciado>` via the native share sheet. **Revoking or tracking invitations is not possible on this backend** |
| Representative profile update | Edit button hidden for representatives (no self-update endpoint; the portal edits the parent licenciado record instead — portal bug) |
| `GET /v1/app/status` | Maintenance mode cannot be triggered remotely |
| Auth Swagger | Auth routes validated by probing only |
| Legal documents / versioned consent | The terms step is implemented with explicit checkbox + typed signature, `terms_version: "v1"` (same as the portal). The API has no document/version source to show the text before acceptance; the app links `EXPO_PUBLIC_TERMS_URL` when set |
| Support attachments upload | Text messages only |
| Course certificates, push device-token registration, client-invitation status | Not offered |

**Deep linking (invitation links):**
- The portal link opens the website. To open the app instead, configure universal links:
  - iOS: `associatedDomains` plus `apple-app-site-association` on the portal domain.
  - Android: `intentFilters` plus `assetlinks.json` with the `com.acvel.app` signing certificate.
  - Map `/auth/register/sublicenciado` to the app route `/register-sublicenciado`.
- Today the app's own scheme works: `acvel-licenciado://register-sublicenciado?codigo=…`.
- `EXPO_PUBLIC_LICENCIADO_WEB_URL` must be set to the portal URL (set 2026-10-08, see 7.1).

### 7.1 Confirmed portal routes (2026-10-08)

Hosts come only from env (`.env`, `.env.example`, `eas.json` build env); the app code holds only the paths
(`src/config/links.ts`, `client-invitation.ts`, `team.service.ts`). Each route below answered 200 on a public
GET (2026-10-08, no login, no writes).

| Flow | URL | Env | Used by the Licenciado app |
|---|---|---|---|
| Terms + privacy (one combined page) | `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade` | `EXPO_PUBLIC_TERMS_URL` = `EXPO_PUBLIC_PRIVACY_URL` | Yes: Termos e privacidade, registration form, onboarding terms step. Equal values → **one** "Termos de uso e privacidade" link (`legalLinks()`); no separate privacy route |
| Consumer terms + privacy | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` | Consumidor app's `EXPO_PUBLIC_TERMS_URL` / `_PRIVACY_URL` | No (Consumidor app) |
| Consumer signup (client invite) | `https://cliente.appacvel.com.br/auth/cadastro?codigo_representante=<codigo>` | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | Yes: Clientes → Link de cadastro (QR / copiar / compartilhar) |
| Consumer referral | `https://cliente.appacvel.com.br/indicacao/<codigo>` | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | No (consumer-to-consumer referral, Consumidor app) |
| Consumer login | `https://cliente.appacvel.com.br/auth/login` | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | Not linked directly; the consumer portal redirects there when there is no session |
| Licenciado login | `https://licenciado.appacvel.com.br/auth/login` | `EXPO_PUBLIC_LICENCIADO_WEB_URL` | Not linked (the app has its own login); reference for the web portal |
| Representative signup | `https://licenciado.appacvel.com.br/auth/register/sublicenciado?codigo=<codigo>` | `EXPO_PUBLIC_LICENCIADO_WEB_URL` | Yes: Equipe → Convidar |
| Minhas Faturas | `https://cliente.appacvel.com.br/faturas` | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | Yes: Mais → Minhas Faturas (confirm → invoice **list**). Without a session the portal redirects to `/auth/login` (verified). Invoice details are never deep-linked |

**Rebuild needed:** the demo APK of 2026-10-06 was built with these values empty, so its QR/invite/Minhas
Faturas/terms entries show as unavailable. The next build picks them up from `.env` / `eas.json`.

---

## 8. File uploads (restored 2026-10-06)

> Upload and re-send are back (section 0.1): onboarding "Documentos" step and Mais → Documentos. The rules below are implemented and unit-tested; the live upload has not been run (write test needs approval).


| Rule | Status |
|---|---|
| MIME: images or PDF only | ✅ client-side check (`validatePickedFile`), unit-tested |
| Size: image ≤ 6 MB, PDF ≤ 12 MB | ✅ client-side check, unit-tested; the backend must re-validate |
| Checksum | ✅ SHA-256 of the bytes |
| Presigned PUT without the Firebase token; non-https upload URLs refused | ✅ unit-tested |
| Upload status | ✅ document list shows Pendente / Em análise / Aprovado / Reprovado, with a "Reenviar" action for rejected documents |
| Live upload (presign → PUT → confirm) | ⏳ write test, needs approval and a test account |
| Relative `upload_url` (local storage driver) | ⚠️ unknown whether live returns `/v1/…` or `/api/v1/…`; the latter would need a path fix. Confirm on the first live upload |
| Support attachments | ❌ no backend endpoint |

---

## 9. Quality checks

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 160 / 160 (2026-10-05), including the live contract test and the live-mapping tests (current run: 12.8, with the **parity-scope guard** `parity-scope.test.ts`) |
| `npx expo-doctor` | ✅ 21 / 21 (after `expo install --fix`: expo 57.0.26 and related patch updates) |
| Jest config | Moved to `jest.config.js`. Since expo 57.0.26, npm nests `expo-modules-core` under `expo/node_modules`, and jest-expo's setup requires it from the top level. The config now resolves it through `expo`. Without this, every suite failed to start |
| `npm run check:prod-bundle` | ✅ production export with the live URLs contains no mock code |

---

## 10. Device / build status

| Item | Status |
|---|---|
| Toolchain | Java 21, Android SDK 36, NDK 27.1, CMake 3.22 |
| **Demo build (2026-10-06, current code)** | ✅ `C:\b\l\build-logs\acvel-licenciado-homolog-0.1.0-1-arm64.apk` — 46.4 MB (48,616,911 bytes), SHA-256 `fa6432d8…12730fff`. `com.acvel.app`, versionName 0.1.0, versionCode 1, arm64-v8a, minSdk 24 / targetSdk 36, label "ACVEL Licenciado (preview)". Signed with the **debug key** (side-load only, not for stores) |
| Demo build verification | ✅ Firebase `teste---00` (app id `1:753725124444:android:…`); embedded hosts only `api-acvel.souaiv.com/api/{auth,business,rateio}`; mock markers 0; test-account e-mail/password not present; no private keys / client secrets. **Permissions: INTERNET, VIBRATE, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE** (install-time, no prompts) — CAMERA, RECORD_AUDIO, storage, SYSTEM_ALERT_WINDOW and biometrics are gone (they were in the previous APK). Brand icon/splash packaged |
| Build conditions | The shared build machine was near its memory commit limit (≈45/48 GB) because of other workloads: the first attempt failed with `clang` killed by a signal + Kotlin daemon connection reset. Rebuilt with `--max-workers=1 --no-daemon`, 1.5 GB heap, in-process Kotlin (31 min). Script: `C:\b\l\build-logs\build-arm64.ps1` |
| Android release build (x86_64) | ✅ `com.acvel.app` 0.1.0, 49.5 MB, label "ACVEL Licenciado (preview)", `minSdk` 24 / `targetSdk` 36, signed with the debug key (not for the stores) |
| Bundle contents | ✅ the Hermes bundle contains the live auth/business URLs and the Firebase project; no mock markers (`acvel.mock.persona`, `mock-token.`, `signInAsPersona`) |
| Android release build (arm64-v8a, for phones) — previous, superseded | ⚠️ outdated: `com.acvel.app` 0.1.0, 48.9 MB, native code arm64-v8a. Same bundle checks as above (live URLs and Firebase project present, no mocks). Ready to side-load on a phone (enable "install unknown apps") |
| Emulator | ❌ **not possible on this machine.** It is a VM without hardware virtualization (`emulator -accel-check`: "Virtualization extension is not supported"), so the x86_64 emulator cannot start |
| On-device: Firebase startup / login / API requests / permissions / navigation | ⏳ needs a physical Android phone (arm64 APK), or a machine with virtualization, or a cloud device service |

**Build notes (Windows):**
- The NDK C++ step fails from the original workspace path. It is long and has spaces, and native object paths under `node_modules` exceed CMake's 250-character limit. The failing compiler call gets no `--target`, and `lld` then rejects `-z`.
- A `subst` drive does not help, because Node resolves it back to the real path.
- Build from a very short path instead, or use EAS Build. The build used a copy at `C:l`: at `C:acvel-buildlicenciado-app`, the x86_64 build passed but the arm64 build still exceeded Windows' 260-character limit in `react-native-gesture-handler`.
- After moving a build copy, delete `android/build`, `android/.gradle` and the `.cxx` folders. The autolinking output caches absolute paths.
- VS Code's Gradle/Java extensions share `~/.gradle` and stopped the build daemon twice while syncing a generated `android/` folder inside the workspace. Don't keep `android/` inside the open workspace while building.

---

## 11. How to reproduce

```bash
cp <client files> firebase/                  # GoogleService-Info.plist, google-services-android.json
npm run firebase:check -- --write-env        # validate ids + write EXPO_PUBLIC_FIREBASE_* to .env
LIVE_EMAIL=… LIVE_PASSWORD=… npm run validate:live -- --label licenciado
LIVE_EMAIL=… LIVE_PASSWORD=… npm run validate:live -- --label sublicenciado
npm run openapi:pull && npm test             # re-check the contract after backend changes
```

---

## 12. Portal parity (audit 2026-10-06, updated after implementation 2026-10-06)

**Reference:** the licenciado portal source `licenciado-web` (latest commit `993df80`, 2026-09-20: 37 pages +
auth). It is the same Next.js app deployed at https://licenciado.appacvel.com.br.
- The public routes (`/auth/*`, `/termos-de-uso-e-privacidade`, `/manutencao`) answer 200 on the deployment.
- The portal's middleware redirects every protected path (even a non-existent one) to `/auth`. The protected
  route set therefore cannot be confirmed from outside, so the source is the reference.
- Inventory method: page-by-page reading of the pages, components and services (read only; no portal login).

> **Scope:** The client confirmed that mobile apps must provide parity with the normal user-facing production portals. Only ADM/internal operator functionality is excluded.

**Status legend:**
- COMPLETE: the same user value, actions and states as the portal (read paths verified live; writes unit-tested).
- WRITE_UNTESTED: implemented and unit-tested; the flow is a write the live validation does not run (needs an
  approved write test / a fresh account).
- CONFIG: implemented; shown once its `EXPO_PUBLIC_*` URL is set (empty in the current `.env`).
- PARTIAL: implemented, but missing actions, filters or views.
- MISSING: not in mobile.
- BLOCKED_BY_DATA: implemented, but can't be validated (no records).
- BLOCKED_BY_BACKEND: needs an endpoint, flag or permission.

**Gap category:** A = mobile gap · B = backend/API gap · C = missing homologation data · D = ADM-only /
intentionally excluded.

### 12.1 Parity matrix

| # | Feature | Portal route | Portal action | Mobile (2026-10-06) | API endpoint | R/W | Status | Gap |
|---|---|---|---|---|---|---|---|---|
| 1 | Login | /auth/login | e-mail + password, show/hide | Login screen, Firebase | Firebase | — | COMPLETE | — |
| 2 | Forgot password | /auth/recover | reset e-mail | Recover screen | Firebase | — | COMPLETE | — |
| 3 | Reset password link | /auth/reset-password | set new password | E-mail link opens the web page | Firebase | — | PARTIAL | A (deep link) |
| 4 | Access denied / blocked | layout guard | "Acesso negado" | Blocked screen (suspended, inactive, forbidden, staff) | `/v1/auth/me` | R | COMPLETE | — |
| 5 | Maintenance | /manutencao (Vercel flag) | static screen | Maintenance screen driven by `/v1/app/status` | `/v1/app/status` (404) | R | BLOCKED_BY_BACKEND | B |
| 6 | Terms & privacy | /termos-de-uso-e-privacidade | static text | One "Termos de uso e privacidade" link (Termos e privacidade, registration, wizard terms step) | — | R | CONFIG | configured 2026-10-08 (7.1); next build |
| 7 | Theme | Topbar | Claro/Escuro/Sistema | Mais → Aparência | — | — | COMPLETE | — |
| 8 | Logout | Topbar | sign out | Mais → Sair | Firebase | — | COMPLETE | — |
| 9 | Notification bell | Topbar | unread count | Bell with count → Notificações | `GET /v1/notifications/me/summary` | R | COMPLETE | — |
| 10 | WhatsApp support | floating button | wa.me with preset text | "Falar no WhatsApp" in Suporte, **shown only when a valid number is configured** | `GET /v1/client-configuracoes/whatsapp-atendimento` | R | BLOCKED_BY_DATA | C (`phoneE164: null`) |
| 11 | "Minhas Faturas" | sidebar | confirm → consumer app | Mais → Minhas Faturas (confirm → `{CONSUMIDOR_APP_URL}/faturas`, the portal handles login) | — | R | CONFIG | configured 2026-10-08 (7.1); next build |
| 12 | Dashboard KPIs | /inicio | 4 cards | 4 metric cards (+ "comissão a receber" when sent) | `GET /v1/dashboards/licenciado-central/{id}` | R | COMPLETE | — |
| 13 | Code / coupon | /inicio | code, copy coupon | Code/coupon card with "Copiar cupom" | `/v1/licenciados/me` | R | COMPLETE | — |
| 14 | kWh by region | /inicio | card | kWh card ("Região não informada" / "Ainda não configurado" when null) | dashboard `summary.kwh_disponivel_regiao` | R | BLOCKED_BY_DATA | C (null) |
| 15 | Dashboard charts | /inicio | clients / commissions per month | "Evolução de clientes" + "Comissões por mês" bars (backend values) | dashboard `charts` | R | COMPLETE | — |
| 16 | Dashboard alerts | /inicio | Ver, mark read, resolve | Ver / Marcar como lido / Resolver | dashboard `alerts`, `POST …/alerts/{id}/read\|resolve` | R + W | COMPLETE | (writes not run live) |
| 17 | Team breakdown | /inicio (LIC) | portfolio per representative | Team breakdown card | `GET /v1/sublicenciados/equipe` | R | BLOCKED_BY_DATA | C |
| 18 | Contract banner | /inicio | status + sign (ZapSign) | Banner when `AGUARDANDO_ASSINATURA` + Termos → Contrato | `GET /v1/licenciados/me/contrato` | R | BLOCKED_BY_DATA | C (contract null) |
| 19 | Clients list | /clientes | list, search, pagination | Carteira: search, infinite scroll | `GET /v1/consumidores` | R | COMPLETE | — |
| 20 | Client filters | /clientes | Status, Cidade, UF | Status chips + Cidade/UF fields (server-side) | `GET /v1/consumidores?cidade&uf&status` | R | COMPLETE | — |
| 21 | Client signup link / QR | /clientes | QR + copy link | "Link de cadastro (QR Code)": on-device QR, Copiar, Compartilhar | — (link from profile code) | R | CONFIG | configured 2026-10-08 (7.1); next build |
| 22 | Client detail | /clientes/[id] | header, status | Header, status, contact | `GET /v1/consumidores/{id}` | R | COMPLETE | — |
| 23 | Client UCs | /clientes/[id]?tab=ucs | UC table | UC list with real number + active badge | detail + `GET /v1/acompanhamento/{id}` | R | COMPLETE | — |
| 24 | Client documents | /clientes/[id]?tab=documentos | list, view | "Documentos do cliente" with Ver (signed URL) | `GET /v1/documentos?proprietario_tipo=CONSUMIDOR` | R | BLOCKED_BY_DATA | C (0 docs) |
| 25 | Ticket from client | /clientes/[id] | "Abrir ticket de suporte" | Same button → opens the new ticket | `POST /v1/support/tickets` | W | COMPLETE | (write not run live) |
| 26 | Journey board | /acompanhamento | funnel/board, search, UF, Cidade, doc pending, overdue, compensating, stage | List + stage chips + all filters (server-side) | `GET /v1/acompanhamento/cards` | R | PARTIAL | A (no funnel/kanban view) |
| 27 | Journey client view | /acompanhamento | stepper, UCs/invoices, next action, gerador interest, copy signing link | Client → Jornada: stage "Etapa N de 7", sub-status, steps, next action, invoices, gerador interest, "Copiar link de assinatura" | `GET /v1/acompanhamento/{id}` | R | COMPLETE | — |
| 28 | Automatic alerts | /acompanhamento/alertas | list, open | Clientes → Pendências | `GET /v1/acompanhamento/alertas` | R | COMPLETE | — |
| 29 | Commission summary | /comissoes | cards, charts, shortcuts | Totals, a receber/previsto/pago when sent, by status, "Comissões por competência" chart, "Ver regras" | `GET /v1/comissoes/stats` | R | BLOCKED_BY_DATA | C (0 commissions) |
| 30 | Statement + detail | /comissoes/extrato | competência, tipo, status, search, rule | Competência, status (server), tipo + client search (client-side, as the portal), detail with "Critérios de geração" | `GET /v1/comissoes`, `/{id}` | R | BLOCKED_BY_DATA | C |
| 31 | Payments + statement | /comissoes/pagamentos | list, extrato | List + statement (portal status labels, failure help, divergence, direct clients, per representative) | `GET /v1/pagamentos-licenciados`, `/{id}/extrato` | R | BLOCKED_BY_DATA | C |
| 32 | Payment receipt | /comissoes/pagamentos | "Baixar comprovante" | "Ver comprovante" + "Compartilhar comprovante" | `GET /v1/pagamentos-licenciados/{id}/comprovante` | R | BLOCKED_BY_DATA | C |
| 33 | Commission rules | /comissoes/regras | rules + per-client checklist | Regras de comissão screen (portal text + checklist from backend eligibility) | `GET /v1/comissoes` | R | COMPLETE | — |
| 34 | Team list + detail | /equipe | metrics, table, detail | List + member detail | `GET /v1/sublicenciados/equipe`, `/{id}` | R | BLOCKED_BY_DATA | C |
| 35 | Representative documents | /equipe | Visualizar | Member detail → documents with Ver | `GET /v1/documentos/{id}/signed-url` | R | BLOCKED_BY_DATA | C |
| 36 | Invite representative | /equipe | QR + copy link | Convidar: code, on-device QR, Copiar, Compartilhar | — | R | CONFIG | configured 2026-10-08 (7.1); next build |
| 37 | Notification inbox | /notificacoes | list, read / all | Same | `GET /v1/notifications/me`, `POST …/read`, `…/read-all` | R + W | COMPLETE | — |
| 38 | Notification filters | /notificacoes | type, severity, search | Search (server) + type/severity chips | `GET /v1/notifications/me?query` | R | COMPLETE | — |
| 39 | Notification preferences | /notificacoes/configuracoes | 4 toggles | Mais → Preferências de notificação (Salvar) | `GET`/`PUT /v1/licenciado-settings/me/notification-preferences` | R + W | COMPLETE | (save not run live) |
| 40 | Profile data | /perfil | data, codes | Meus dados | `GET /v1/licenciados/me` / `sublicenciados/me` | R | COMPLETE | — |
| 41 | Own documents | /perfil | list, view | Mais → Documentos (+ Reenviar on rejected) | `GET /v1/documentos`, `/{id}/signed-url` | R | COMPLETE | — |
| 42 | Contract section | /perfil#contrato | status, sign | Termos e privacidade → Contrato | `GET /v1/licenciados/me/contrato` | R | COMPLETE | C |
| 43 | Preferences / consents | /perfil/preferencias | channels, consents | Mais → Preferências (channels, marketing opt-in, channel consents; missing = off) | `GET`/`PUT /v1/licenciado-settings/me/preferences` | R + W | COMPLETE | (save not run live) |
| 44 | Change password | /perfil/seguranca | change | Segurança → Alterar senha (Firebase) | Firebase | W | COMPLETE | — |
| 45 | Sessions | /perfil/seguranca | list, end | Same | `GET`/`DELETE /v1/auth/sessions/me*` | R + W | COMPLETE | — |
| 46 | Approval status | /status | status + reason | Seu cadastro (status, steps, pending items, documents, Iniciar/Continuar) | `/v1/auth/me`, `GET /v1/onboarding/…` | R | COMPLETE | — |
| 47 | New ticket | /suporte | category → open | Novo chamado | `POST /v1/support/tickets` | W | COMPLETE | (write not run live) |
| 48 | Ticket list | /suporte/tickets | status, category, protocol search | Protocol search + status + category chips | `GET /v1/support/tickets` | R | BLOCKED_BY_DATA | C (0 tickets) |
| 49 | Ticket conversation | /suporte/tickets/[id] | messages, reply, resolve | Same | `GET`/`POST …/messages`, `PATCH …/status` | R + W | COMPLETE | C |
| 50 | Academy library | /treinamentos | category, level, status filters | Visible for licenciado/representative (portal rule) + filters | `GET /v1/training/courses` | R | BLOCKED_BY_DATA | C (0 courses) |
| 51 | Course + lessons | /treinamentos/[c]/[l] | player, materials, complete | Course, lessons, YouTube, materials, complete | `GET …/courses/{id}`, `…/lessons`, `POST …/complete` | R + W | BLOCKED_BY_DATA | C |
| 52 | Training progress | /treinamentos/progresso | KPIs + per-course chart | Hours, level, per-course progress bars | `GET /v1/training/summary` | R | COMPLETE | — |
| 53 | Marketplace catalogue | /marketplace | catalogue | Points, products, orders (hidden without the flag) | `GET /v1/pedidos/me/context`, `/v1/produtos`, `/v1/pedidos` | R | BLOCKED_BY_BACKEND | B (no `features.marketplace`) + C |
| 54 | Registration — licenciado | /auth/register | form | Welcome → Quero ser Licenciado | `POST {AUTH}/v1/auth/register-licenciado` | W | WRITE_UNTESTED | — |
| 55 | Registration — representative | /auth/register/sublicenciado | by code (typed or link) / invite | Welcome → Recebi um convite (code typed or from link; invite token) | `register-sublicenciado`, `validate-codigo`, `convites/validar` | W | WRITE_UNTESTED | — |
| 56 | Onboarding — licenciado | /onboarding | 5 steps + submit | Wizard: Documentos → Dados pessoais → Empresa → Dados bancários → Revisão (terms + submit) | `iniciar`, `validate-uniqueness`, `PUT …/etapas/*`, `submit`, `bootstrap-me` | W | WRITE_UNTESTED | C (pending account) |
| 57 | Onboarding — representative | /onboarding | 6 steps + submit | Wizard: Termos → Empresa → Acesso → Documentos → Dados pessoais → Envio | `iniciar-sublicenciado`, `PUT …/etapas/*`, `submit` | W | WRITE_UNTESTED | C |
| 58 | Document upload / re-send | /onboarding, /perfil | upload, re-send | Wizard step + Mais → Documentos | `presign-upload`, PUT, `confirm-upload`, `reenviar` | W | WRITE_UNTESTED | — |
| 59 | Profile edit (licenciado) | /perfil "Editar dados" | name, phone | Meus dados → Editar | `PUT {AUTH}/v1/auth/profile`, `PATCH /v1/licenciados/{id}` | W | WRITE_UNTESTED | — |
| 60 | Marketplace redeem / cancel | /marketplace/[id]/checkout, /marketplace/pedidos | redeem, cancel pending | Resgatar (confirm, Idempotency-Key); cancel PENDENTE/PROCESSANDO | `POST /v1/pedidos`, `POST /v1/pedidos/{id}/cancel` | W | BLOCKED_BY_BACKEND | B (flag) |

**Mobile-only (beyond the portal):** account-deletion request (LGPD), offline banner with cached reads,
pending-area help and academy.

**Documented mismatches:**
- *Academy visibility:* the portal shows Academy to every user; the live permission list has no training
  resource, but the live training endpoints answer 200 for the licenciado. Per the parity rule the app grants
  `training:use` to LICENCIADO/SUBLICENCIADO when the permission list is present (`normalizeAuthMe`), never to
  staff. If the backend starts returning 403 on training, the screens show the permission state.
- *Consents:* the portal defaults missing LGPD consents to `true`; the app shows them as off until the user
  saves an explicit choice.
- *Representative profile edit:* the portal edits the parent licenciado's record for a representative (bug);
  the app hides edit for representatives.

### 12.2 P6 review — features previously excluded

| Feature | Portal route | Normal user allowed? | API write | Mobile status | Decision |
|---|---|---|---|---|---|
| Registration (licenciado / representative) | /auth/register, /auth/register/[tipo] | Yes (public signup) | `POST {AUTH}/v1/auth/register-*`, `POST /v1/sublicenciados/validate-codigo`, `POST /v1/convites/validar` | Restored (welcome, forms, code entry) | **Restore** — normal user action |
| Onboarding wizard (LIC 5 steps / SUB 6 steps) | /onboarding | Yes (own registration) | `POST /v1/onboarding/iniciar*`, `validate-uniqueness`, `PUT …/etapas/*`, `POST …/submit`, `bootstrap-me` | Implemented (wizard + Iniciar/Continuar) | **Restore** — approval itself stays ADM |
| Document upload / re-send | /onboarding, /perfil | Yes (own documents) | `presign-upload`, PUT, `confirm-upload`, `reenviar` | Restored (SHA-256 checksum, size/type checks, no storage path shown) | **Restore** — document validation stays ADM |
| Profile edit | /perfil "Editar dados" | Yes (licenciado) | `PUT {AUTH}/v1/auth/profile`, `PATCH /v1/licenciados/{id}` | Restored for licenciados | **Restore** (representative: no self endpoint — backend gap) |
| New client (4-step wizard) | /clientes/novo | Route exists but is **orphaned** (no link anywhere in the portal UI; `POST /v1/consumidores` needs internal ids/address) | `POST /v1/consumidores` | Not implemented; clients join via the signup link/QR (as in the portal) | **Keep out** — not a reachable portal function; revisit if the portal links it |
| Marketplace order / cancel | /marketplace/[id]/checkout, /marketplace/pedidos | Yes (behind the marketplace flag) | `POST /v1/pedidos`, `POST /v1/pedidos/{id}/cancel` | Restored behind `features.marketplace` | **Restore** — hidden until the backend sends the flag |
| Dashboard alert mark-read / resolve | /inicio | Yes (own alerts) | `POST …/alerts/{id}/read`, `…/resolve` | Implemented | **Restore** |
| Manual representative registration | /equipe (modal never rendered) | Dead code in the portal | `pre-cadastro` | — | Excluded (not a portal function) |
| Approve / reject representative | none (service only) | No | `POST /v1/sublicenciados/{id}/aprovar\|reprovar` | — | **Excluded (ADM)** |
| Admin roles / back-office | `admin*` slugs | No | — | — | **Excluded (ADM)** |
| "Importar lista", "Adicionar UC", Topbar search | /clientes, /clientes/[id] | Dead buttons in the portal | none | — | Not functional in the portal |

### 12.3 Parity score

| Measure | Before (audit) | After (2026-10-06) |
|---|---|---|
| Features in scope | 53 | **60** (the 7 P6 rows restored or reviewed: 6 restored + marketplace order; New client stays out) |
| COMPLETE | 19 | 31 |
| WRITE_UNTESTED | — | 6 |
| CONFIG | — | 4 |
| BLOCKED_BY_DATA | 3 | 13 |
| PARTIAL | 15 | 3 |
| MISSING | 14 | **0** |
| BLOCKED_BY_BACKEND | 2 | 3 |
| **Weighted parity** (COMPLETE, WRITE_UNTESTED, CONFIG, BLOCKED_BY_DATA = 1; PARTIAL = 0.5) | (22 + 7.5) / 53 ≈ 56 % | **(54 + 1.5) / 60 ≈ 93 %** |
| Verified live (COMPLETE only) | 19 / 53 ≈ 36 % | 31 / 60 ≈ 52 % |

### 12.4 Remaining gaps

**A. Mobile:**
- Journey funnel/kanban view (#26) — the board is a filtered list with stage chips.
- Reset-password deep link into the app (#3).
- Configuration: the portal URLs for #6, #11, #21, #36 were confirmed and set on 2026-10-08 (7.1). They
  take effect in the next build (the 2026-10-06 APK predates them).

**B. Backend/API:**
- `GET /v1/app/status` (maintenance) — 404.
- `features.marketplace` flag missing in `/v1/auth/me` (#53, #60).
- No training permission resource (app applies the portal rule, 12.1).
- `GET /v1/sublicenciados/convites` returns 400; no invitation write routes.
- No representative self-update endpoint.
- 401 instead of 403 + code for "valid token, unknown user".
- Support attachment upload, push device-token endpoint.
- No WhatsApp number configured (`phoneE164: null`).
- Exposure of full CPF/CNPJ, bank data and storage paths in responses (the app never displays storage paths).

**C. Missing homologation data:** see 12.5.

**D. ADM-only / excluded:** see 12.2 and section 0.

### 12.5 Homologation data still needed

| Data | Mobile flow it unblocks |
|---|---|
| Commissions (several statuses and competências) | Summary + chart, statement filters, detail criteria (#29, #30) |
| A payment batch with status PAGO and a receipt | Payments, statement, receipt (#31, #32) |
| A representative linked to this licenciado (+ its credentials) | Team, member documents, dashboard team breakdown, representative role (#17, #34, #35) |
| A **fresh** pending licenciado and representative account | Onboarding wizard, uploads, submit (#46, #54–58) — needs an approved write test |
| A client with documents | Client documents tab (#24) |
| Published Academy courses with lessons | Academy (#50–52) |
| `features.marketplace=true` + products | Marketplace (#53, #60) |
| An existing ticket with replies | Ticket list filters and conversation (#48, #49) |
| A contract (ZapSign) for the licenciado | Contract banner/section (#18, #42) |
| `phoneE164` configured | WhatsApp button (#10) |
| `kwh_disponivel_regiao` for the region | kWh card (#14) |

### 12.6 Demo readiness (current client test account, no backend writes)

| Demo step | Ready? | What to show / caveat |
|---|---|---|
| Login | ✅ | Firebase login, approved-licenciado routing |
| Dashboard | ✅ | KPIs, code/coupon (copy), clients chart, alerts with Ver; kWh card shows "não informada" |
| Clients | ✅ | 87 clients, search, status + city/UF filters, link de cadastro QR (needs `CONSUMIDOR_APP_URL`) |
| Client detail | ✅ | Contact, UC numbers, journey details, client documents (empty), "Abrir ticket" (avoid tapping: write) |
| Journey + pending actions | ✅ | 87 cards with stage chips and filters; 63 alerts |
| Commissions | ⚠️ | Empty states + rules page; no data to show amounts |
| Documents | ✅ | Mais → Documentos lists own documents with Ver (signed URL) |
| Notifications + preferences | ✅ | Inbox with filters; preferences screens (don't save during a no-write demo) |
| Profile / security | ✅ | Meus dados, sessions |
| Academy | ✅ / ⚠️ | Visible now; empty library (0 courses) |
| Onboarding wizard | ⚠️ | Needs a pending account and approved writes |
| Marketplace | ❌ | Hidden (no backend flag) |

- **Demo readiness: 11 / 12 steps ≈ 92 %** (counting the two ⚠️ data-dependent steps as half: 10 / 12 ≈ 83 %
  with full content).
- **Prerequisite:** a fresh device build (the last APK predates these changes); a physical Android phone
  (no emulator on this machine) or an EAS build.

### 12.7 Release readiness

| Item | Status | Detail |
|---|---|---|
| Android package / iOS bundle id | ✅ | `com.acvel.app` (iOS never built here: needs EAS) |
| Firebase files | ⚠️ homologation | Project `teste---00`; production needs the production project files |
| Version / build number | ✅ strategy | `version` (marketing, semver) in `app.config.ts`; build numbers managed by EAS (`appVersionSource: "remote"`, `autoIncrement` on production) |
| App name | ✅ | "ACVEL Licenciado" in production, "(development/preview)" otherwise |
| Icon / splash / adaptive icon | ✅ | Generated from the portal brand assets (`licenciado-web/public/brand`): dark square logo icon, white wordmark splash on `#094496`, adaptive foreground/monochrome/background |
| Native permissions | ✅ config | Unused modules removed (`expo-image-picker`, `expo-file-system`); `android.blockedPermissions` blocks CAMERA, RECORD_AUDIO, storage/media, SYSTEM_ALERT_WINDOW, biometrics. Confirm on the next APK's merged manifest |
| iOS export compliance | ✅ | `ITSAppUsesNonExemptEncryption = false` |
| EAS build profiles | ✅ | `eas.json`: development (internal APK / iOS simulator), preview (internal APK), production (AAB, auto-increment). No store credentials or EAS project id committed — `eas init` + credentials needed |
| Environment variables | ⚠️ | API URLs and the confirmed portal URLs set in `.env` and `eas.json` (7.1); production Firebase config pending |
| Store signing | ❌ | Upload keystore / Apple distribution certificate not set up (EAS credentials) |
| Push notifications | ❌ | No FCM/APNs integration and no backend device-token endpoint |
| Store compliance | ⏳ | Privacy policy URL, Data Safety form, App Store privacy labels, reviewer demo account |

### 12.8 Final checks (2026-10-06, after implementation)

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 problems |
| `npm test` | ✅ 201 / 201 (13 suites), incl. `parity-scope.test.ts`, `parity-features.test.ts`, live contract (now with the restored write endpoints) and live mapping |
| `npm run check:prod-bundle` | ✅ production bundle contains no mock code |
| `npm run test:live -- --label licenciado` | ✅ 38 backend requests, **all GET, 0 writes**; only the expected non-2xx (401 ×2, 404 ×2, 400 invitations) |

---

## 13. Homologation validation with backend test data (2026-10-08)

**Method (read-only):** login (Firebase password sign-in) + GET only. No data created, no write endpoint called.
- `npm run test:live -- --label <account>` for the 4 accounts: 38 GET calls per approved licenciado.
- A temporary probe ran the app's **own** session, route and service/mapper code (`fetchMe`,
  `resolveRouteState`, every feature service) through the real HTTP transport. Its fetch guard allowed only
  the sign-in POST and GETs; the guard log shows **0 blocked/attempted writes**. The probe file was deleted after
  the run.
- Credentials are kept in the git-ignored `validation-results/accounts.env` and are not reproduced here.

### 13.1 Accounts used

| Account | Identification | App routing (real `fetchMe` + `resolveRouteState`) |
|---|---|---|
| Main licenciado | Felipe Mair Rodrigues · `LIC-663394` | ✅ `APPROVED` → main tabs |
| Approved representative | `representante.app@example.com` · Representante Teste App · `SUB-773730` (parent `LIC-663394`) | ✅ `APPROVED` → main tabs (representative scope) |
| Pending representative | `representante.pendente.app@example.com` | ✅ `PENDENTE_APROVACAO` → pending area "Seu cadastro" |
| Pending licenciado | `licenciado.pendente.app@example.com` | ✅ `PENDENTE_APROVACAO` → pending area "Seu cadastro" |

`/v1/auth/me` has no `approvalStatus` for any account; the app derives it from the business record status,
as designed.

### 13.2 Data confirmed per module

| # | Module | Expected (backend team) | Live result (app code) | Status |
|---|---|---|---|---|
| 1 | Authentication | 4 logins, status screens | 4 logins OK; routing as in 13.1; token refresh OK | ✅ |
| 2 | Dashboard | commission, kWh, contract, charts, alerts | KPIs 88 clients / 88 active; "Comissões por mês" 07/2026 = R$ 23,13 (paid); kWh card **SUL · 180.000 kWh**; 20 alerts (DOCUMENTO_PENDENTE); contract ASSINADO (no banner, correct for signed) | ✅ |
| 3 | Client Joao Fernando Verdasca de Lima | details, RG + CNPJ, UCs, journey, support | Found by search; APROVADO, pessoa jurídica; 3 UCs with real numbers (`000280511403160`, `000175525203178`, `000014929303180`), all active; journey **INADIMPLENTE** (stage 8, "1 fatura(s) vencida(s)", next "Cobrar o cliente…"), 8 invoices, 3 UC requests; documents **RG + CNPJ** (APROVADO); "Abrir ticket de suporte" visible (write, not executed) | ✅ data · ❌ document preview (13.3 B1) |
| 4 | Documents | own, client, contract; preview/download/share | Own: **CONTRATO_ASSINADO** ("Contrato assinado"), CNH, RG — all APROVADO; client: RG, CNPJ | ✅ list · ❌ preview for all 5 (13.3 B1) |
| 5 | Commissions / payments | R$ 23,13 PAGA; `LOTE-TESTE-APP-20260812`; text receipt | Statement: 1 commission R$ 23,13, **PAGA**, competência 2026-05, client Joao Fernando; stats total R$ 23,13; payment **PAGO**, R$ 23,13 líquido, PIX; statement totals 23,13 / divergence 0; receipt button shown; **text receipt (859 chars) names `LOTE-TESTE-APP-20260812`** | ✅ · ⚠️ receipt shows an internal path (13.3 B2); ⚠️ criteria card (13.3 A2) |
| 6 | Academy | 1 published course, 1 lesson | "Como apresentar a ACVEL ao cliente (teste do app)", 1 lesson "Aula 1 - Introdução" with video URL; progress 0 %, level Iniciante; course detail OK | ✅ (completion not executed — write) |
| 7 | Marketplace | "Vale-presente de teste", stock 50 | Product **"Vale-presente de teste (app)"**, 100 pontos, active, `estoque_disponivel` 50; context: 0 points, can_purchase true, 0 orders | ⚠️ data OK, **screen hidden** — no `features.marketplace` flag (13.3 B3); the app does not display stock |
| 8 | Support | ticket "[HML] Teste app mobile" | Listed (AGUARDANDO, CADASTRO_DOCUMENTOS); detail OK; 1 message (from the user) | ✅ (no reply/resolve — writes) |
| 9 | WhatsApp | +55 11 98731-1039 | `5511987311039` passes the app's validation → "Falar no WhatsApp" shown | ✅ |
| 10 | kWh | SUL · 180.000 kWh | `regiao: SUL`, `kwh_disponivel_regiao: 180000` (licenciado and representative) | ✅ |
| 11 | Pending onboarding | steps, missing items, messages | **Licenciado:** DRAFT, current step DOCUMENTOS_ENVIADOS, 5 pending (DOCUMENTOS_ENVIADOS, DADOS_PESSOAIS, DADOS_PROFISSIONAIS, DADOS_BANCARIOS, CONTRATO_ACEITO), 0 %, can_submit false, no documents. **Representative:** DRAFT, current step CONFERENCIA_EMPRESA, 5 pending (CONFERENCIA_EMPRESA, DADOS_LOGIN, DOCUMENTOS_ENVIADOS, DADOS_PESSOAIS, TERMOS_ACEITOS), 0 % | ✅ data · ⚠️ pending items shown as raw codes (13.3 A1) |
| — | Settings (licenciado) | — | Notification preferences (4 on) and preferences (channels, consents) load | ✅ |
| — | Team (licenciado) | linked representative | "Representante Teste App" (APROVADO, 1 client) and "Representante Pendente App" (PENDENTE_APROVACAO); member has 0 documents | ✅ |
| — | Approved representative | — | Dashboard (1 client, SUL 180.000 kWh), commissions (empty), academy, WhatsApp OK. Payments 403 and Team 403 (by design, hidden for representatives); **support 403** and **settings 404** (13.3 B4, A3) | ✅ / ⚠️ |

### 13.3 Findings

**Backend blockers**
- **B1 — Document preview cannot work on mobile.** `GET /v1/documentos/{id}/signed-url` returns a **relative**
  path to `/v1/documentos/{id}/content`, which needs the Bearer token (verified: 401 without it, 200
  `application/pdf` with it). A phone browser cannot send the token, so "Ver" cannot open any document (own,
  client, representative, contract). The app correctly refuses non-https/relative links (shows nothing).
  The portal works only because its server-side proxy adds the token.
  *Fix options:* (a) backend returns a real signed URL (token/expiry in the query, no Bearer) — no app change;
  or (b) app downloads with the token and opens/shares the file — needs native modules
  (`expo-file-system` + `expo-sharing`) and a new build.
- **B2 — Receipt text exposes an internal storage path** (`Comprovante de origem: /private/licenciados/…`).
  The app shows the backend text as-is. Fix in the backend text, or filter that line in the app.
- **B3 — Marketplace flag:** `/v1/auth/me` still has no `features.marketplace`; the screen stays hidden although
  the product exists. Redemption was not executed.
- **B4 — Representative support:** support tickets return 403 (`READ em suporte`). The app hides Suporte for
  representatives (consistent), so representatives also don't reach the WhatsApp button.
- **Data note:** the dashboard chart puts the R$ 23,13 commission in 07/2026 (payment month) while the
  commission's competência is 2026-05 — both are backend values, shown as received.

**App display issues (small, not fixed in this validation pass — need approval and a new build)**
- **A1 — Pending items show raw codes** ("• CONFERENCIA_EMPRESA", "• TERMOS_ACEITOS") on "Seu cadastro". Map them
  to labels (as the completed steps already are).
- **A2 — "Critérios de geração" on a paid commission shows ❌ ❌ ❌** because the backend sends no
  `regra_aplicada` for this commission. Show "Critérios não informados" when the rule is absent.
- **A3 — "Preferências" is visible to representatives** but the endpoint returns 404 for them (it resolves a
  licenciado). Hide it for representatives (backend gap: no representative settings).
- Stock (`estoque_disponivel`) is not displayed on product cards (portal shows availability).

### 13.4 Can the current APK (2026-10-06) demonstrate these flows?

| Flow | Current APK |
|---|---|
| Login (4 accounts), approved vs pending routing | ✅ |
| Dashboard: KPIs, charts, kWh SUL 180.000, alerts, contract status | ✅ |
| Client Joao Fernando: detail, UC numbers, journey, document list | ✅ (preview ❌ B1) |
| Commissions R$ 23,13 PAGA, payment PAGO, statement, text receipt with the batch code | ✅ (shows the internal path line, B2) |
| Academy course + lesson (video opens in YouTube/browser) | ✅ |
| Support ticket list/detail/messages; WhatsApp button | ✅ (licenciado) |
| Team: approved + pending representative | ✅ |
| Pending licenciado / representative "Seu cadastro" with steps and pending items | ✅ (raw codes, A1) |
| Marketplace product | ❌ hidden (B3) |
| Document preview/download/share | ❌ (B1) |
| Signup-link QR, invite link, Minhas Faturas, terms link | ❌ in this APK — built before the URLs were set (7.1); next build |

**Demo readiness with the current APK ≈ 80 %** (12 of 15 flows; the 3 ❌ are B1, B3 and the URL-dependent
links). With a rebuild (URLs), fixes A1–A3 and backend fixes B1–B3: ≈ 100 % of the read-only demo.

---

## 14. Final demo preparation (2026-10-08)

**Final validation date:** 2026-10-08 (homologation backend `api-acvel.souaiv.com`, Firebase `teste---00`;
login + GET only, 0 writes — section 13).

**Tested accounts**

| Account | Result |
|---|---|
| Felipe Mair Rodrigues · `LIC-663394` (approved licenciado) | ✅ main app |
| `representante.app@example.com` (approved representative, `SUB-773730`) | ✅ main app, representative scope |
| `representante.pendente.app@example.com` (pending representative) | ✅ "Seu cadastro" |
| `licenciado.pendente.app@example.com` (pending licenciado) | ✅ "Seu cadastro" |

**Validated modules:** authentication and routing (4 accounts), dashboard (KPIs, charts, kWh SUL 180.000,
alerts, contract status), clients (Joao Fernando Verdasca de Lima: detail, 3 UC numbers, journey, document
list), documents list (own incl. signed contract, client RG/CNPJ), commissions (R$ 23,13 PAGA), payments
(PAGO, statement, text receipt with `LOTE-TESTE-APP-20260812`), academy (1 course, 1 lesson), support (ticket
"[HML] Teste app mobile"), WhatsApp (+55 11 98731-1039), team (approved + pending representative), pending
onboarding (licenciado and representative).

### 14.1 Display fixes (no business logic / API change)

| Finding (13.3) | Fix |
|---|---|
| A1 — pending items as backend codes | Shared mapper `onboardingStepLabel()` (`src/lib/status-labels.ts`): e.g. `CONFERENCIA_EMPRESA` → "Conferência da empresa", `DOCUMENTOS_ENVIADOS` → "Envio de documentos", `TERMOS_ACEITOS` → "Aceite dos termos". Unknown codes → "Etapa do cadastro"; codes are never shown. Used on "Seu cadastro" (completed + pending) and the wizard review step |
| A2 — ❌ ❌ ❌ on a paid commission | `commissionEligibility().available`; when the backend sends no criteria, commission detail and the rules page show "Critérios não disponíveis" (no failed icons) |
| A3 — representative preferences 404 | "Preferências" and "Preferências de notificação" are shown to licenciados only; a direct link shows "Disponível apenas para licenciados." |
| Stock not shown | Product card shows "Estoque disponível: X unidades" only when the backend sends `estoque_disponivel` |
| B1 — document preview | Non-public (relative/non-https) links are never opened; "Ver" shows "Visualização indisponível. Solicite abertura pelo portal." **Backend dependency** (below) |

Tests: 206 / 206 (new: step labels, criteria availability, stock mapping).

### 14.2 URL configuration (env only, nothing hardcoded)

| Variable | Demo/homologation build (`.env`, `eas.json` development/preview) | Production profile |
|---|---|---|
| `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | `https://cliente-test.appacvel.com.br` | `https://cliente.appacvel.com.br` (`eas.json` base) |
| `EXPO_PUBLIC_LICENCIADO_WEB_URL` | `https://licenciado.appacvel.com.br` | same |
| `EXPO_PUBLIC_TERMS_URL` = `EXPO_PUBLIC_PRIVACY_URL` | `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade` | same |

Verified (public GET, 2026-10-08): signup link `cliente-test…/auth/cadastro?codigo_representante=LIC-663394` 200;
invite link `licenciado…/auth/register/sublicenciado?codigo=LIC-663394` 200; terms page 200; `cliente-test…/faturas`
→ redirects to `/auth/login` without a session (expected).

### 14.3 Demo APK (2026-10-08)

| Item | Result |
|---|---|
| File | `C:\b\l\build-logs\acvel-licenciado-homolog-demo-0.1.0-1-arm64-20261008.apk` — 46.4 MB (48,619,319 bytes), SHA-256 `d3604496…df9d32c8` |
| Identity | `com.acvel.app`, versionName 0.1.0, versionCode 1, arm64-v8a, label "ACVEL Licenciado (preview)", debug-signed (side-load only) |
| Backend / Firebase | Only `api-acvel.souaiv.com/api/{auth,business,rateio}` (homologation); Firebase `teste---00` |
| Portal URLs in bundle | `cliente-test.appacvel.com.br`, `licenciado.appacvel.com.br`, terms path ✅; production consumer host `cliente.appacvel.com.br` 0; `api.appacvel.com.br` 0 |
| Credentials / secrets | None of the 4 test accounts' e-mails or the password are in the APK; no private keys / client secrets |
| Mocks / debug tools | Mock markers 0; not debuggable; no dev-client / dev-menu / devtools modules (only React Native's built-in module name string) |
| Permissions | INTERNET, VIBRATE, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE (no runtime prompts) |
| Supersedes | `acvel-licenciado-homolog-0.1.0-1-arm64.apk` (2026-10-06, kept for reference) |

**Demo coverage with this APK:** all read-only flows of 13.4 incl. signup QR, invite link, terms and Minhas
Faturas; pending items and commission criteria now readable. Not demonstrable: document preview (B1) and
marketplace (B3) — both backend dependencies. **Demo readiness ≈ 87 % (13 of 15 flows).**

### 14.4 Remaining backend dependencies

1. **Document preview (B1):** `signed-url` must return a public signed URL (no Bearer), or the app needs a
   native download/share module (new build). Until then "Ver" shows the portal notice.
2. **Marketplace requires backend `features.marketplace`** in `/v1/auth/me`. The app keeps the server flag rule
   (not hardcoded); the product data ("Vale-presente de teste (app)", stock 50) is ready.
3. **Receipt text (B2)** contains an internal storage path line (`Comprovante de origem: /private/…`); remove it
   in the backend text.
4. **Representative support** returns 403; **representative settings** return 404 (licenciado-only API).
5. Still open from section 12: `GET /v1/app/status`, training permission resource, invitations endpoint (400),
   representative profile update, support attachment upload, push device-token endpoint, 401 vs 403 for unknown
   users.
6. Release: shared `com.acvel.app` with the Consumidor app (migration plan pending approval), production
   Firebase, store signing.

---

## 15. Communication parity audit — mobile vs licenciado portal (2026-10-12)

**Scope:** user-facing text only. No business logic, API calls, payloads or features changed. Reference: the
portal source `licenciado-web/src` (menus, pages, components and label maps), compared area by area (navigation
+ account + onboarding; clients + journey + documents + team; dashboard + commissions + payments; support +
notifications + academy + marketplace + shared states).

**Rules applied**
- Where the portal has the same concept, the mobile text now uses the portal wording, casing and status names.
- The portal is **not** copied where it shows raw enums or code (`PENDENTE`, `RESOLVIDO`, `cliente.compensando = true`,
  `INFO/WARNING/CRITICAL`, raw sender `USER/AGENT`), English/technical words (`Login`, `Dados login`,
  `Opt-in marketing`, "(regra verdade)", "subs"), or missing accents (`Divergencia`, `comissoes`, `Ola`). In those
  cases the mobile keeps (or adopts) the correctly written Portuguese equivalent.
- Terminology: **"ticket"** (portal; "chamado" removed), **"Representante"** (portal UI; "Sublicenciado" only
  appears in portal fallbacks), **"Clientes"** (portal menu/pages), **"Fatura de energia"** (never "conta de energia").

**Result: 111 text replacements + 2 new label maps (18 portal labels) in 37 source files.** typecheck ✅,
lint ✅, tests 208 / 208 ✅ (2 new: UC-request labels, payment-method labels).

### 15.1 Changes

| Mobile text (before) | Web / now | Location | Action |
|---|---|---|---|
| **Status names** | | | |
| Account `Em cadastro` / `Precisa de ajustes` | `Pendente` / `Reprovado` | `lib/status-labels.ts` (accountStatusLabels; also team members) | replaced (portal Topbar) |
| Client `Em cadastro` | `Em ativação` | `lib/status-labels.ts` (clientStatusLabels) | replaced |
| Commission `Prevista` / `Em pagamento` / `Estornada` | `Pendente` / `Liberada` / `Cancelada` | `lib/status-labels.ts` | replaced (portal shows 4 statuses) |
| Payment `Pendente` / `Processando` / `Falhou` | `Aguardando corte` / `Em processamento` / `Falha técnica` | `lib/status-labels.ts`; payments list now uses the same map as the payment detail | replaced |
| UC request `em analise admin` (raw code) | `Em análise pela ACVEL`, `Termo gerado`, `Enviada à concessionária`… (14 labels) | `lib/status-labels.ts` `ucRequestStatusLabel`, `ClientJourneyDetails.tsx` | raw enum → portal map |
| Gerador `Solicitação contacted.` (raw, English) | `Interesse em ser gerador de energia registrado — já contatado / aguardando contato.` | `ClientJourneyDetails.tsx` | raw enum → portal text |
| Payment method `PIX` (raw) | `Pix` (unknown codes hidden) | `payments/[paymentId].tsx`, `paymentMethodLabel` | raw enum → label |
| Journey board badge (legacy client status) | journey stage (`Onboarding em andamento`, `Na concessionária`…) | `ClientLists.tsx` | replaced (portal shows the stage) |
| `Aguardando UC` | `Aguardando unidade consumidora` | `lib/status-labels.ts` | no bare "UC" |
| Notification type `Informativo` | `Info geral` | `lib/status-labels.ts` | replaced (no clash with severity "Informativo") |
| **"Seu cadastro" / onboarding** | | | |
| `Ajustes solicitados:` | `Motivo da reprovação:` | `app/pending/status.tsx` | replaced |
| Step `Empresa` (licenciado) / `Dados profissionais` | `Dados da empresa` | `OnboardingWizard.tsx`, `onboardingStepLabel` | replaced |
| Step `Empresa` / `Acesso` / `Envio` (representative) | `Conferência da empresa` / `Dados de acesso` / `Revisão` | `OnboardingWizard.tsx` | replaced (portal "Dados login" not copied) |
| `Celular` / `Endereço` / `Complemento` | `Telefone` / `Logradouro` / `Complemento (opcional)` | `OnboardingWizard.tsx` | replaced |
| **Dashboard** | | | |
| `Clientes` · `Na carteira` | `Clientes cadastrados` · `Total na carteira` | `app/(app)/(tabs)/index.tsx` | replaced |
| `Comissão do mês` · `Previsto` | `Comissões previstas` · `Competência atual` | `app/(app)/(tabs)/index.tsx` | replaced |
| `Precisa da sua atenção` | `Alertas operacionais` | `DashboardWidgets.tsx` | replaced |
| `Seu contrato aguarda assinatura` | `Seu contrato Licenciado Pro está aguardando assinatura` | `DashboardWidgets.tsx` | replaced |
| code `—` | `Não gerado` (licenciado) / `Não disponível` (representative) | `DashboardWidgets.tsx` | replaced |
| `previsto R$…` (team breakdown) | `comissão prevista R$…` | `DashboardWidgets.tsx` | replaced |
| **Commissions / payments** | | | |
| `Previsto no mês` / `Pago (12 meses)` / `Por situação` | `Estimado (mês atual)` / `Pago (últimos 12 meses)` / `Comissão por status` | `commissions/index.tsx` | replaced |
| `Comissões por competência` | `Comissões por mês` | `commissions/index.tsx` | replaced (same as home) |
| `· {representante}` (statement row) | `· Cadastrado por: {representante}` | `commissions/index.tsx` | replaced |
| `Nenhum pagamento ainda.` | `Sem pagamentos para exibir.` | `commissions/index.tsx` | replaced |
| Title `Pagamento` / `Comissão` | `Extrato do pagamento` / `Detalhe do lançamento` | `payments/[paymentId].tsx`, `[commissionId].tsx` | replaced |
| `Sua parte` / `Clientes diretos` | `Parte do licenciado` / `Clientes diretos do licenciado` | `payments/[paymentId].tsx` | replaced |
| `Divergência no lote:` | `Divergência entre total do lote e itens:` | `payments/[paymentId].tsx` | replaced (with accent) |
| Bank failure help | `Falha bancária. É necessário corrigir os dados e gerar novo lote.` | `payments/[paymentId].tsx` | replaced |
| `Critérios não disponíveis` | `Critérios indisponíveis para este lançamento.` / `Critérios indisponíveis.` | `[commissionId].tsx`, `rules.tsx` | replaced |
| `…já estão compensando, informada pela ACVEL.` | `…já estão compensando.` | `rules.tsx` | replaced |
| **Clients / journey / documents / team** | | | |
| Segments `Jornada` / `Pendências` | `Acompanhamento` / `Alertas` | `clients/index.tsx` | replaced |
| `Link de cadastro (QR Code)` | `Gerar QR Code de cadastro` | `clients/index.tsx` | replaced |
| QR caption | `Compartilhe com o cliente para cadastro vinculado ao seu código de representante.` | `clients/signup-link.tsx` | replaced |
| Title `Cliente` | `Detalhe do cliente` | `clients/[clientId].tsx` | replaced (sentence case) |
| `Nome, CPF ou CNPJ` | `Nome ou CPF/CNPJ` | `ClientLists.tsx` | replaced |
| `Nenhuma pendência. Tudo em dia!` / `Nenhum cliente em acompanhamento.` | `Sem alertas no momento` / `Sem clientes no acompanhamento` | `ClientLists.tsx` | replaced |
| alert action `{ação}` | `Ação: {ação}` | `ClientLists.tsx` | replaced |
| `Jornada` / `Solicitações de UC` / `Link copiado` / `⚡ Quer ser gerador` | `Jornada do cadastro` / `UCs e faturas` / `Link de assinatura copiado` / `⚡ Cliente quer ser gerador` | `ClientJourneyDetails.tsx` | replaced |
| `Ver` (documents) | `Visualizar` | `DocumentList.tsx` | replaced |
| rejection reason alone | `Motivo: {motivo}` | `DocumentList.tsx` | replaced |
| `Conta de energia` | `Fatura de energia` | `DocumentList.tsx` | replaced |
| `Meus documentos` / `Nenhum documento enviado.` | `Documentos enviados` / `Sem documentos enviados` | `OwnDocuments.tsx`, `DocumentList.tsx` | replaced |
| `UCs` (member detail) | `UCs vinculadas` | `team/[memberId].tsx` | replaced |
| **Support** | | | |
| `chamado` (9 places: titles, buttons, empty state, menu subtitle) | `ticket` (`Novo ticket`, `Detalhe do ticket`, `Abrir ticket`, `Nenhum ticket encontrado`, `Ticket não encontrado.`, `Tickets e mensagens`) | `support/*`, `pending/support/*`, `SupportViews.tsx`, `more/index.tsx` | replaced |
| `Assunto` (above categories) / `Título (opcional)` | `Categoria` / `Assunto (opcional)` | `SupportViews.tsx` | replaced (fields were mislabelled) |
| `Marcar como resolvido` · `Encerrar chamado?` · `Encerrar` | `Fechar como resolvido` · `Confirmar resolução` · `Resolver ticket` | `SupportViews.tsx` | replaced |
| Categories `Cadastro e documentos` / `Pagamentos e comissões` / `Fatura` | `Cadastro/Documentos` / `Pagamento` / `Minha fatura` (portal order) | `support.service.ts` | replaced |
| `Falar no WhatsApp` | `Fale com a ACVEL pelo WhatsApp` | `SupportViews.tsx` | replaced |
| **Notifications / settings** | | | |
| severity `Todas` / `Buscar` | `Todas as severidades` / `Buscar em título e mensagem` | `notifications.tsx` | replaced |
| `Nenhuma notificação para esses filtros.` | `Nenhuma notificação encontrada para os filtros atuais.` | `notifications.tsx` | replaced |
| `Salvar` / `Preferências salvas.` | `Salvar preferências` / `Preferências salvas com sucesso.` | `more/preferences.tsx`, `more/notification-preferences.tsx` | replaced |
| **Academy / marketplace** | | | |
| `{n} concluído(s)` · `Nível:` · `h estudadas` | `{n} cursos concluídos` · `Nível atual:` · `horas estudadas` | `AcademyViews.tsx` | replaced |
| empty with filters / `Sem aulas.` | `Não encontramos cursos para os filtros selecionados.` / `Sem aulas cadastradas para este curso.` | `AcademyViews.tsx` | replaced |
| `Seus pontos` / `Buscar` / `Nenhum produto disponível.` / `Nenhum pedido.` / `Cancelar pedido?` | `Saldo disponível` / `Buscar item` / `Nenhum item encontrado.` / `Nenhum pedido encontrado.` / `Confirmar cancelamento` | `marketplace.tsx` | replaced |
| **Account / auth / shared** | | | |
| `Alterar senha` (title + button) | `Trocar senha` | `more/security.tsx` | replaced |
| `Código de licenciado` / `Código de representante` | `Código do licenciado` / `Código do representante` | `ProfileDetails.tsx` | replaced |
| menu `Documentos enviados e status` | `Documentos enviados e situação` | `more/index.tsx` | replaced (no "status") |
| `Enviar link` | `Enviar link de recuperação` | `(auth)/recover.tsx` | replaced |
| `Precisa de ajuda?` + developer note "(S33)" | `Precisa de suporte?` + `Entre em contato com a equipe ACVEL.` | `app/blocked.tsx` | replaced (dev text removed) |
| `Acesso não permitido` (permission state) | `Acesso bloqueado` | `components/states/QueryState.tsx` | replaced |
| `Tente novamente em instantes.` (4 places) | `Tente novamente em alguns instantes.` | `States.tsx`, `services/api/errors.ts` | replaced |
| `Sua sessão expirou. Entre novamente.` / `Não foi possível concluir esta ação.` | `Sua sessão expirou. Faça login novamente.` / `Não foi possível concluir a ação.` | `services/api/errors.ts`, `http-transport.ts` | replaced |

### 15.2 Files changed

`src/lib/status-labels.ts`; `src/app/(app)/(tabs)/index.tsx`; `src/features/dashboard/components/DashboardWidgets.tsx`;
`src/app/(app)/(tabs)/commissions/index.tsx`, `[commissionId].tsx`, `payments/[paymentId].tsx`, `rules.tsx`;
`src/app/(app)/(tabs)/clients/index.tsx`, `[clientId].tsx`, `signup-link.tsx`;
`src/features/clients/components/ClientLists.tsx`, `ClientJourneyDetails.tsx`;
`src/features/documents/components/DocumentList.tsx`, `OwnDocuments.tsx`; `src/app/(app)/(tabs)/team/[memberId].tsx`;
`src/app/(app)/support/new.tsx`, `[ticketId].tsx`; `src/app/pending/support/new.tsx`, `[ticketId].tsx`;
`src/features/support/components/SupportViews.tsx`, `support.service.ts`; `src/app/(app)/notifications.tsx`;
`src/app/(app)/(tabs)/more/index.tsx`, `preferences.tsx`, `notification-preferences.tsx`, `security.tsx`;
`src/features/academy/components/AcademyViews.tsx`; `src/app/(app)/marketplace.tsx`;
`src/features/onboarding/components/OnboardingWizard.tsx`; `src/app/pending/status.tsx`;
`src/features/profile/components/ProfileDetails.tsx`; `src/app/(auth)/recover.tsx`; `src/app/blocked.tsx`;
`src/components/states/States.tsx`, `QueryState.tsx`; `src/services/api/errors.ts`, `http-transport.ts`;
tests: `src/features/__tests__/parity-features.test.ts`.

### 15.3 Remaining wording differences (kept on purpose or need a decision)

**Kept — the portal shows raw enums, code, jargon or missing accents**
- Status badges printed as enums in the portal (commission/payment/order statuses, notification severities
  `INFO/WARNING/CRITICAL`, team status, message sender `USER/AGENT`, "status para RESOLVIDO"). Mobile keeps labels.
- Commission criteria as code (`cliente.compensando = true`, "(regra verdade)"); split labels with "sub/subs"
  (`Repasse sub`, `Repasses dos subs`) → mobile keeps "Repasse ao representante" / "Repasses a representantes".
- `Dados login`, `Opt-in marketing`, `Login`, `Status` (wizard step) → mobile keeps Portuguese equivalents.
- Portal strings without accents (`Divergencia`, `comissoes`, `Competencia`, `Ola!`).

**Kept — mobile layout or clearer action**
- Tab labels `Comissões`, `Equipe` (portal menu `Comissões / Carteira`, `Representantes / Equipe`).
- `Seu cadastro` / `Situação atual` (portal page `Status de Aprovação` / `Status atual`).
- `Meus dados`, `Mais`, group headers, `Aparência`, `Dispositivos conectados` / `Este aparelho`
  (portal `Sessões ativas` / `Sessão atual`), `Salvar e continuar` (portal `Avançar`), `Resgatar` (portal mixes
  "compra" and "resgate"), `Ver comprovante` (mobile shows the receipt inline; portal downloads), `{n} pontos`
  (portal `pts`), `Academy` / `Curso` headers (portal `ACVEL Academy` / `Treinamento`).
- Filter "all" chips (`Todos`, `Todas`, `Todos os tipos`) where the portal uses select placeholders.

**Need a product decision (not changed)**
- `Cadastro do representante` vs portal `Cadastro do Sub-Licenciado` (the portal itself mixes "Representante" and
  "Sub-Licenciado").
- Ticket subject sent from the client screen (`Cliente {nome}` vs portal `Solicitação aberta pelo detalhe do
  cliente`) — it is request data, so it was left unchanged (no payload change).
- Portal UI that mobile does not have (alert severity/type badges, "Quer ser gerador" board filter, "Pode gerar
  comissão" verdict on the commission detail) — these are features, not wording.
- Free text sent by the backend is shown as received (`regra_aplicada.motivo`, server validation messages for
  4xx, onboarding `reprovado_motivo`, receipt text). Some may be technical or English; they are backend content.
