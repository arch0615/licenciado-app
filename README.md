# ACVEL Licenciado — Mobile App (Android / iOS)

Expo + TypeScript app for **Licenciados** and **Representantes (sublicenciados)**.
It is a standalone project, a sibling of the other two apps:

```
licenciado/
├── licenciado-web/   Next.js web app + all specification docs (docs/mobile-*.md)
├── licenciado-api/   Fastify backend
└── licenciado-app/   ← this project
```

It stays independent from the other two, which keeps a later move to a monorepo easy:
- no path imports across projects;
- the shared contracts are the backend's HTTP API and the docs.

**Status: API integration.** Screens call the ACVEL backends through `Screen → Hook → Service → API client`.
Endpoints in the licenciado-api Swagger (auth, profile, team, invitations) are contract-tested against
`docs/openapi/licenciado-api.json`. The other modules follow the legacy contracts in
`licenciado-web/docs/backend-api-inventory.md` and are **unverified** until the business API publishes
its OpenAPI (see `src/services/api/__tests__/contract.test.ts`). With `EXPO_PUBLIC_USE_MOCKS=true`
the same code runs against an in-memory mock backend.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19, TypeScript (strict) |
| Navigation | expo-router (file-based, typed routes, `Stack.Protected` / `Tabs.Protected`) |
| Data | @tanstack/react-query (per-user cache keys, foreground refetch, NetInfo online state) |
| Theme | Token system in `src/theme` (light/dark from the ACVEL design system), Montserrat 400/500/600/700 |
| Icons | lucide-react-native (same set as the web app) |
| Validation | zod |
| Tests | jest-expo + @testing-library/react-native |

## Getting started

```bash
cp .env.example .env         # EXPO_PUBLIC_USE_MOCKS=true by default
npm install
npm start                    # Expo Go / dev build; press a (Android) or i (iOS)
```

With mocks on, the login screen shows a **"Modo demonstração"** panel. Pick a persona to try each routing case:

| Persona | E-mail | Lands on |
|---|---|---|
| Licenciado aprovado | `licenciado@acvel.dev` | Tabs: Início · Clientes · Comissões · **Equipe** · Mais |
| Representante aprovado | `representante@acvel.dev` | Tabs: Início · Clientes · Comissões · **Academy** · Mais |
| Licenciado em análise | `pendente@acvel.dev` | Pending area: Cadastro · Academy · Ajuda · Perfil |
| Representante em cadastro | `rep-pendente@acvel.dev` | Pending area |
| Licenciado recém-cadastrado | `novo@acvel.dev` | Pending area (cadastro não iniciado) |
| Conta suspensa | `suspenso@acvel.dev` | Blocked screen |
| Usuário de outra plataforma | `outro@acvel.dev` | Blocked (403 PLATFORM_FORBIDDEN) |

- You can also sign in with one of these e-mails and any password.
- The password `senha-errada` simulates wrong credentials.
- **"Simular manutenção"** switches on the maintenance screen.

## Commands

```bash
npm run lint               # expo lint (eslint-config-expo)
npm run typecheck          # tsc --noEmit
npm test                   # jest
npm run verify             # lint + typecheck + test
npm run check:prod-bundle  # exports a production Android bundle and fails if any mock code is inside
npm run bundle:check       # exports the current configuration (proves the route tree compiles)
npm run doctor             # expo-doctor
```

**Before any store build, all of these must pass:**
- `npm run verify`
- `npm run check:prod-bundle`
- `npm run doctor`

## Environment

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_APP_ENV` | `development` \| `preview` \| `production` |
| `EXPO_PUBLIC_USE_MOCKS` | `true` = in-memory mock backend + mock auth. **Forbidden in production**: `app.config.ts` and `src/config/env.ts` both refuse it |
| `EXPO_PUBLIC_AUTH_API_URL` | Auth service base URL (`/v1/auth/*`). https in production |
| `EXPO_PUBLIC_BUSINESS_API_URL` | Business service base URL (profile, clients, commissions, team, support, academy…). https in production |
| `EXPO_PUBLIC_RATEIO_API_URL` | Rateio service (reserved; no app endpoint uses it yet) |
| `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | Consumer app, for the client self-registration link shared by the app |
| `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` | Public legal pages (opened in the browser) |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | Request timeout (default 15000) |
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | Firebase web config (public by design). Without it the app stays signed out |

licenciado-api serves both auth and business routes: point both URLs at it.

`EXPO_PUBLIC_*` values are embedded in the app. **Never put secrets in them.**

## Structure

```
src/
  app/                              routes (expo-router)
    _layout.tsx                     providers + role/approval routing (Stack.Protected)
    bootstrap.tsx                   session loading / error with retry
    maintenance.tsx                 remote maintenance state
    blocked.tsx                     suspended · inactive · blocked · forbidden · staff
    (auth)/                         welcome · login · register · register-sublicenciado · recover
    pending/                        tabs: status · academy · help · profile   (URL prefix /pending)
    (app)/_layout.tsx               stack above the tabs (notifications, future modal flows)
    (app)/(tabs)/                   index · clients/ · commissions/ · team/ (LIC) · academy/ (SUB) · more/
  features/
    auth/                           types, AuthGateway, route-state resolver, SessionProvider, api
    profile/                        AccountSection (profile header, Aparência, Sair)
    onboarding/ clients/ commissions/ team/ academy/ support/ notifications/ documents/ legal/  (spec pointers)
  components/
    ui/        AppText · Button · Card · Badge · Screen · Skeleton
    forms/     TextField
    cards/     MetricCard
    states/    EmptyState · ErrorState · LoadingState · ScreenPlaceholder · OfflineBanner
    navigation/ ScreenHeader · TabStack · tab-options
    brand/     BrandMark (text placeholder until vector logos exist)
    dev/       DevTools (mock panel slot; compiled out of production)
    sheets/    (bottom sheets, added with the first sheet)
  services/
    api/       ApiClient · http-transport (Bearer, refresh-on-401, timeout, error envelope) · mock-transport · errors
    query/     QueryProvider · query-client · query-keys
    storage/   secure-storage (preferences only — never tokens)
    runtime.ts composition root: mock vs real auth gateway and transport
  theme/       tokens (colors light/dark, typography, spacing, radius, elevation) · ThemeProvider
  config/      env (zod-validated EXPO_PUBLIC_* config)
  lib/         status-labels (enum → human label + tone)
  mock/        personas · mock-state · mock-auth-gateway · handlers · MockDevPanel   (dev only)
```

## How routing works

1. The **auth gateway** restores the identity. It is `FirebaseAuthGateway` when the Firebase env vars are set; `MockAuthGateway` when mocks are on; otherwise `UnconfiguredAuthGateway` (always signed out, fails closed).
2. **`GET /v1/auth/me`** returns the server-resolved role, tenant and approval status.
3. **`resolveRouteState()`** (`src/features/auth/route-state.ts`, pure and unit-tested) produces one of: `bootstrapping`, `error`, `maintenance`, `signedOut`, `blocked`, `pending` or `approved`. `pending` and `approved` also carry the role.
4. The root layout exposes **exactly one route group per state** with `Stack.Protected`. The approved tabs use `Tabs.Protected`: Equipe exists only for licenciados, Academy only for representantes.

Unknown or failed states always land on a non-privileged screen, so the app fails closed. These guards are UX only; the backend enforces access on every request.

## Adding a feature screen

Follow `src/features/README.md`. In short:
1. Add the API functions and mock routes, with the same paths and payloads as licenciado-api.
2. Add React Query hooks keyed with `queryKeys.user(uid, …)`.
3. Build the screen from the shared components.
4. Handle loading, empty, error and offline states.
5. Add tests.

## Mock exclusion (verified)

Mock modules are loaded with `require()` **inside a positive `if (process.env.EXPO_PUBLIC_USE_MOCKS === "true")` block**. Expo inlines the value and Metro folds the condition before collecting dependencies, so production bundles contain no mock code.
- Do **not** move the check into a variable.
- Do **not** turn it into an early return.

Both patterns were measured to leak mock modules into the bundle; `npm run check:prod-bundle` guards this.

## Integration rules

- **Auth:** Firebase JS SDK (`FirebaseAuthGateway`, AsyncStorage persistence). Every request sends `Authorization: Bearer <ID token>`; a 401 forces one token refresh and retry, then signs out. 403 shows a permission state and is never retried.
- **Role and approval** come only from `GET /v1/auth/me`. The UI hides features with `hasPermission(me, …)`; the backend is the authority.
- **No ids from the client:** tenant, owner and user ids are never sent in bodies or filters. The two legacy paths that need an id (dashboard, onboarding) use the value returned by `/v1/auth/me`.
- **No financial math:** amounts, points and progress are displayed as received (`src/lib/format.ts` only formats them).
- **No automatic legal acceptance:** the terms/contract onboarding step is not implemented until a legal-documents endpoint exists.
- **Uploads:** presign → PUT → confirm. Absolute presigned URLs never receive the Firebase token.
