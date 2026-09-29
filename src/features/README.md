# Features

One folder per business module. A feature owns its API calls, query hooks, schemas and
feature-specific components. Routes in `src/app/` stay thin and import from here.

```
features/<module>/
  <module>.service.ts  functions that take the ApiClient: (api) => api.get<T>("/v1/...")
  use<Module>.ts       React Query hooks using queryKeys.user(uid, "<module>", ...)
  schemas.ts        zod schemas (forms, response parsing where useful)
  status.ts         enum → { label, tone } maps (never render raw enums)
  components/       feature components (ClientCard, CommissionCard, ...)
  __tests__/        unit tests
```

## Rules
1. **API:** use `api` from `@/services/runtime` (never `fetch`). Swagger (`docs/openapi/licenciado-api.json`) is the
   source of truth; endpoints not in it follow licenciado-web/docs/backend-api-inventory.md and must be listed as
   `INVENTORY` in `src/services/api/__tests__/contract.test.ts`. Pass `service: "auth"` for `/v1/auth/*`.
2. **Mocks:** add routes for your endpoints in `src/mock/` (same paths/payloads as the backend) so the
   feature works with `EXPO_PUBLIC_USE_MOCKS=true`. Feature code must not know whether mocks are on.
3. **Cache keys:** every user/tenant query key starts with the user id (`queryKeys.user(uid, ...)`).
4. **Roles:** read the role/approval from `useAuthenticatedContext()`; hide UI for other roles but
   remember the backend is the authority (handle `403 { code }` gracefully).
5. **States:** every screen handles loading (skeleton), empty (with action), error (with retry), offline.
6. **Critical mutations** (checkout, submissions, invitations): pass `idempotencyKey` (reuse on retry)
   and disable the button while pending.
7. **Copy:** Portuguese with accents; no developer text in the UI.
