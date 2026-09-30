# Live API Validation — ACVEL Licenciado app

**Status: in progress.** Firebase, unauthenticated and contract checks against the live backend are done.
Authenticated checks (sections 4–6) and the Android build (section 8) are waiting for:
- the client's Firebase files (`firebase/GoogleService-Info.plist`, `firebase/google-services-android.json`);
- test accounts (approved licenciado, approved representante, pending account).

Last run: 2026-09-30.

**Legend:** ✅ validated · ⚠️ works with a caveat · ❌ fails / missing · ⏳ not validated yet (needs credentials)

---

## 1. Target environment

| Service | Base URL (`.env`) | Health | Swagger |
|---|---|---|---|
| Auth | `https://api-acvel.souaiv.com/api/auth` | ✅ `GET /health` → 200, database connected | ❌ not published (`/docs`, `/docs-json` → 404) |
| Business | `https://api-acvel.souaiv.com/api/business` | ✅ 200, database connected | ✅ `/docs-json`: 339 operations, saved as `docs/openapi/acvel-business-live.json` |
| Rateio | `https://api.appacvel.com.br/api/rateio` | ✅ 200, database + redis connected | ✅ `/docs-json`: 327 operations, saved as `docs/openapi/acvel-rateio-live.json` |

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
| Client files present | ⏳ **not received yet.** The only Firebase files on this machine belong to an unrelated project and were not used |
| Initialization (JS SDK, `initializeAuth`) | ⏳ needs the config values |
| Persistence (AsyncStorage) | ⏳ device run |
| Token retrieval / refresh | ⏳ `npm run validate:live` exercises sign-in → refresh → API call with the refreshed token |
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

## 4. Auth + role routing — ⏳ needs accounts

`npm run validate:live -- --label <account>` runs these checks per account. Only statuses and field names are recorded, never values or tokens.

| Step | Expectation | Result |
|---|---|---|
| Firebase sign-in (email/password) | ID token + refresh token | ⏳ |
| Token refresh | new ID token accepted by the API | ⏳ |
| Invalid token | 401 → app signs out | ⏳ |
| `GET /v1/auth/me` | role (`tipoUsuarioResolvido`/`roleSlug`), ids | ⏳ |
| `approvalStatus` present? | if absent, the app derives it from `/licenciados/me` or `/sublicenciados/me` (legacy path, already implemented) | ⏳ |
| `permissions` present? | if absent, the UI uses role defaults; the backend still enforces every call | ⏳ |
| Routing: unauthenticated / pending / approved / blocked | Login / pending area / tabs / blocked screen | ⏳ (device) |
| Representative cannot reach licenciado-only data | `/sublicenciados/equipe` and `/pagamentos-licenciados` → 403; no `valor_comissao` in commissions | ⏳ |

---

## 5. Module validation (live) — ⏳ needs accounts

Order as requested. **"Contract"** = the endpoint exists in the live Swagger with the method the app uses (checked by `src/services/api/__tests__/contract.test.ts`).

| # | Module | Endpoints (app → live) | Contract | Live call |
|---|---|---|---|---|
| 1 | Authentication | `/v1/auth/me` (auth service) | n/a (no auth Swagger); route exists | ⏳ |
| 2 | Profile | `GET /v1/licenciados/me`, `GET /v1/sublicenciados/me`, `PATCH /v1/licenciados/{id}`, `GET /v1/licenciados/me/contrato`, `GET {AUTH}/v1/auth/sessions/me` | ✅ (PATCH adapted) | ⏳ |
| 3 | Clients | `GET /v1/consumidores?nome|cpf|cnpj|status&page&perPage` | ✅ | ⏳ |
| 4 | Client details | `GET /v1/consumidores/{id}` | ✅ | ⏳ |
| 5 | Client journey | `GET /v1/acompanhamento/cards`, `GET /v1/acompanhamento/{id}` | ✅ | ⏳ |
| 6 | Pending actions | `GET /v1/acompanhamento/alertas` | ✅ | ⏳ |
| 7 | Create client | `POST /v1/consumidores` | ❌ schema mismatch (section 6) | not attempted (write) |
| 8 | Commissions | `GET /v1/comissoes/stats`, `/v1/comissoes`, `/v1/comissoes/{id}` | ✅ | ⏳ |
| 9 | Payments | `GET /v1/pagamentos-licenciados`, `/{id}/extrato` | ✅ | ⏳ |
| 10 | Team | `GET /v1/sublicenciados/equipe`, `/v1/sublicenciados/{id}` | ✅ | ⏳ |
| 11 | Invitations | token invitations | ❌ not on live → code link (section 7) | ⏳ |
| 12 | Onboarding | `GET /v1/onboarding/{licenciado|sublicenciado}/{id}`, `iniciar*`, `…/submit` | ✅ | ⏳ |
| 13 | Documents | `GET /v1/documentos`, `presign-upload`, `confirm-upload`, `{id}/reenviar` | ✅ (checksum added) | not attempted (write) |
| 14 | Support | `/v1/support/tickets*` | ✅ | ⏳ |
| 15 | Academy | `/v1/training/*` | ✅ | ⏳ |
| 16 | Notifications | `/v1/notifications/me*` | ✅ | ⏳ |
| 17 | Marketplace | `/v1/pedidos/me/context`, `/v1/produtos`, `/v1/pedidos*` | ✅ | ⏳ |

**Totals:**
- 52 of 59 business calls exist on the live API.
- The 7 missing ones are listed in section 7.

**Write operations** (create client, upload, ticket, order, invitation) will only be run with explicit approval, on test data.

---

## 6. Schema mismatches (from the live Swagger)

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

## 7. Backend missing features (live) and app behaviour

| Missing on the live API | App behaviour |
|---|---|
| Token invitations (`/v1/sublicenciados/convites*`, `/v1/convites/validar`) | Detected at runtime (404). The Team screen hides the invitation list, and "Convidar" shares the portal's code link `{EXPO_PUBLIC_LICENCIADO_WEB_URL}/auth/register/sublicenciado?codigo=<codigo_licenciado>` via the native share sheet. **Revoking or tracking invitations is not possible on this backend** |
| Representative profile update | Edit button hidden for representatives |
| `GET /v1/app/status` | Maintenance mode cannot be triggered remotely |
| Auth Swagger | Auth routes validated by probing only |
| Legal documents / versioned consent | Terms/contract onboarding step not implemented (nothing is accepted automatically). The live API has `PUT …/etapas/termos`, but no document/version source to show before acceptance |
| Support attachments upload | Text messages only |
| Course certificates, push device-token registration, client-invitation status | Not offered |

**Deep linking (invitation links):**
- The portal link opens the website. To open the app instead, configure universal links:
  - iOS: `associatedDomains` plus `apple-app-site-association` on the portal domain.
  - Android: `intentFilters` plus `assetlinks.json` with the `com.acvel.app` signing certificate.
  - Map `/auth/register/sublicenciado` to the app route `/register-sublicenciado`.
- Today the app's own scheme works: `acvel-licenciado://register-sublicenciado?codigo=…`.
- `EXPO_PUBLIC_LICENCIADO_WEB_URL` must be set to the portal URL.

---

## 8. File uploads

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
| `npm test` | ✅ 145 / 145, including the live contract test |
| `npx expo-doctor` | ✅ 21 / 21 (after `expo install --fix`: expo 57.0.26 and related patch updates) |
| `npm run check:prod-bundle` | ✅ production export with the live URLs contains no mock code |

---

## 10. Device / build status

| Item | Status |
|---|---|
| Toolchain | Java 21 and Android SDK (platforms, build-tools, emulator images) present. `ANDROID_HOME` is not set; it will be set for the build |
| Android build | ⏳ waiting for the Firebase files, so the build embeds `google-services-android.json` and can sign in |
| On-device: Firebase / login / API requests / permissions / navigation | ⏳ |

---

## 11. How to reproduce

```bash
cp <client files> firebase/                  # GoogleService-Info.plist, google-services-android.json
npm run firebase:check -- --write-env        # validate ids + write EXPO_PUBLIC_FIREBASE_* to .env
LIVE_EMAIL=… LIVE_PASSWORD=… npm run validate:live -- --label licenciado
LIVE_EMAIL=… LIVE_PASSWORD=… npm run validate:live -- --label sublicenciado
npm run openapi:pull && npm test             # re-check the contract after backend changes
```
