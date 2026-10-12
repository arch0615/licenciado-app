# Device QA — ACVEL Licenciado (homologation demo build)

**Build under test:** `acvel-licenciado-homolog-demo-0.1.0-1-arm64-20261008.apk` — 46.4 MB, SHA-256 `d3604496…df9d32c8`,
versionName 0.1.0 / versionCode 1, debug-signed (side-load only). Verification: `docs/live-api-validation.md` §14.3.
(`api-acvel.souaiv.com`), mock mode off.

**Account:** the client test licenciado account (approved, 87 clients). Credentials are held by the project
lead and are never written in this document.

**Hard rule for this account: read-only.** Do not tap any action marked ✍️ (it writes to the live backend).
Write flows are tested separately with dedicated accounts (section 3).

Mark each line ✅ pass · ❌ fail (add a note + screenshot) · ➖ not testable (state why).

---

## 0. Setup

- [ ] Android phone, Android 7.0+ (minSdk 24), arm64. Note model + Android version.
- [ ] Settings → Apps → "Install unknown apps" allowed for the file manager / browser used.
- [ ] Install the APK. App label: **"ACVEL Licenciado (preview)"**; icon: ACVEL logo on blue.
- [ ] App info → Permissions: **"No permissions requested"** (the APK only declares install-time INTERNET,
      VIBRATE and network state). No Camera, Microphone, Files/Media, Location, "Display over other apps".
- [ ] If an older ACVEL Licenciado test build is on the phone, uninstall it first so no stale session or cache
      from the previous build affects the test.
- [ ] Splash: white ACVEL wordmark on blue (dark mode: dark background).

## 1. Common checks — apply to every screen below

| Check | How |
|---|---|
| Loading | First open shows skeletons/spinner, no blank screen or layout jump |
| Empty | Modules without data show a friendly empty state (no "undefined", "null", "NaN", raw codes) |
| Error | Turn on airplane mode **after** the screen loaded, pull to refresh → error message with "Tentar novamente"; turn network back on → retry works |
| Offline | Start the app offline → offline banner; cached screens still readable; no crash |
| Back navigation | Android back button and header back return to the previous screen; back on a tab root does not close the app unexpectedly |
| Keyboard | Fields are not hidden by the keyboard; "next"/"done" behave; tapping outside dismisses |
| Safe areas | Nothing under the status bar, camera notch or gesture bar; test in portrait |
| Theme | Repeat a few screens with Mais → Aparência → Escuro |
| Text | Portuguese with accents; no truncated buttons with large system font (Settings → Display → Font size max) |

## 2. Functional checklist

### Authentication
- [ ] Login with the test account → lands on Início (tabs).
- [ ] Wrong password → clear message, no crash.
- [ ] "Esqueci minha senha" screen opens (do **not** send if the account must stay untouched — sending only e-mails a link, it changes nothing until used).
- [ ] Session restore: force-close the app, reopen → still logged in, no login screen.
- [ ] Token refresh: leave the app in background > 1 hour, reopen → data loads without logging out.
- [ ] Logout (Mais → Sair) → back to Welcome; reopen app → still logged out.
- [ ] After logout + login, no data from the previous session flashes.

### Dashboard (Início)
- [ ] KPI cards show values (clients, active clients, UCs em ativação, comissão do mês).
- [ ] Charts: "Evolução de clientes" has bars; commissions chart shows "Sem dados no período" (no data).
- [ ] Code/coupon card shows the code; "Copiar cupom" → paste somewhere to confirm.
- [ ] kWh card shows "—" with "Região não informada" / "Ainda não configurado" (live value null).
- [ ] Team breakdown: hidden or empty (account has no representatives).
- [ ] Contract banner: not shown (live contract null) — expected.
- [ ] Alerts list: "Ver" opens the client. ✍️ "Marcar como lido" / "Resolver" — **do not tap**.

### Clients
- [ ] Carteira list loads (≈ 87 clients), infinite scroll loads more.
- [ ] Search by name and by CPF/CNPJ.
- [ ] Filters: status chips; Cidade and UF (e.g. UF "SP"); "Limpar filtros".
- [ ] Client detail: name, status, contact buttons (call / WhatsApp open the phone apps).
- [ ] UC numbers: real 15-digit numbers; never a UUID.
- [ ] Journey section: stage "Etapa N de 7", steps, next action; "Copiar link de assinatura" when present.
- [ ] Jornada tab: stage chips and toggles (documento pendente, inadimplente, compensando), city/UF.
- [ ] Pendências tab: alerts list (≈ 63) with severity.
- [ ] "Link de cadastro (QR Code)": QR scans with another phone and opens `https://cliente-test.appacvel.com.br/auth/cadastro?codigo_representante=LIC-663394`; "Copiar link" and "Compartilhar link" work.
- [ ] ✍️ "Abrir ticket de suporte" on a client — **do not tap**.

### Documents
- [ ] Mais → Documentos: own documents with status (Contrato assinado, CNH, RG). "Ver" shows "Visualização indisponível. Solicite abertura pelo portal." and opens no browser page (backend dependency, §14.4).
- [ ] Rejected document shows the reason. ✍️ "Reenviar" — **do not tap** (section 3).
- [ ] Client detail → "Documentos do cliente": Joao Fernando shows RG and Cartão CNPJ; "Ver" shows the same portal notice.
- [ ] Representative documents (Equipe → member): ➖ no representatives in this account.
- [ ] Payment receipt open/share: ➖ no paid payment in this account.

### Commissions
- [ ] Summary: totals, by status (or empty state).
- [ ] "Comissões por competência" chart: empty state.
- [ ] "Ver regras de comissão" → rules page.
- [ ] Extrato filters (competência, status, tipo, search) work on the empty list without errors.

### Payments
- [ ] Pagamentos list: empty state "Nenhum pagamento ainda".
- [ ] Detail / receipt / divergence / failure states: ➖ no data (section 4).

### Team
- [ ] Equipe list: empty state; invitations section does not show an error.
- [ ] Convidar: shows `LIC-663394`; QR/copy/share of `https://licenciado.appacvel.com.br/auth/register/sublicenciado?codigo=LIC-663394`.
- [ ] Representative detail: ➖ no representatives.

### Academy
- [ ] Academy is visible (Mais → Academy) and opens.
- [ ] Course list: empty state (0 courses); filters (categoria, nível, status) don't crash.
- [ ] Progress card: hours/level show "—" or 0 without errors.
- [ ] Lessons / completion: ➖ no courses.

### Support
- [ ] Ticket list: empty state; protocol search, status and category chips.
- [ ] "Falar no WhatsApp": **hidden** (no number configured) — expected.
- [ ] Conversation / reply / resolve: ➖ no ticket; ✍️ creating one is a write (section 3).

### Notifications
- [ ] Bell shows the unread count.
- [ ] List (≈ 2 notifications); search, type and severity chips.
- [ ] ✍️ Opening an unread notification marks it read; "Marcar todas como lidas" — **avoid** (section 3).

### Profile / settings
- [ ] Meus dados: name, codes, contact. ✍️ "Editar" → **cancel without saving**.
- [ ] Preferências: toggles load; consents show the saved state. ✍️ **Do not tap Salvar**.
- [ ] Preferências de notificação: 4 toggles load. ✍️ **Do not tap Salvar**.
- [ ] Segurança: sessions list (≈ 6). ✍️ **Do not end sessions**. "Alterar senha" — do not submit.
- [ ] Termos e privacidade: contract section; **one** "Termos de uso e privacidade" entry opening `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade`.
- [ ] Mais → "Minhas Faturas": confirmation dialog → opens `https://cliente-test.appacvel.com.br/faturas`; without a consumer session the portal shows its login page. Never opens an invoice detail.

### Onboarding (needs pending accounts — section 3)
- [ ] Pending licenciado: Seu cadastro → Iniciar / Continuar cadastro → 5 steps → Revisão.
- [ ] Pending representative: 6 steps (Termos → Empresa → Acesso → Documentos → Dados pessoais → Envio).
- [ ] Document upload: picker opens (no camera permission prompt); image > 6 MB / PDF > 12 MB rejected.
- [ ] Terms: "Enviar" disabled until the checkbox is ticked and a full name is typed.

### Marketplace
- [ ] Not in Mais (no `features.marketplace` flag on the backend) — expected.
- [ ] Products / redeem / cancel: ➖ until the flag and products exist.

---

## 3. Write flows — dedicated test accounts only

None of these may run on the client test licenciado account. Each needs explicit approval before the first live
run, and the result must be recorded in `docs/live-api-validation.md`.

| Write action | Endpoint(s) | Required account / data before live execution |
|---|---|---|
| Registration — licenciado | `POST {AUTH}/v1/auth/register-licenciado` | A new, unused e-mail the team controls; agreement on how to delete the test user afterwards |
| Registration — representative | `register-sublicenciado`, `validate-codigo`, `convites/validar` | A new e-mail + a **test licenciado code** (not the client account's), so no representative is attached to real teams |
| Onboarding — licenciado | `bootstrap-me`, `iniciar`, `validate-uniqueness`, `PUT …/etapas/*`, `submit` | The fresh licenciado from the registration test (status not started / DRAFT); **test CPF/CNPJ and bank data** that pass validation but are not real people; ACVEL operator ready to reject/delete the submission |
| Onboarding — representative | `bootstrap-me`, `iniciar-sublicenciado`, `PUT …/etapas/*`, `submit` | A fresh representative linked to a **test** licenciado; test CPF |
| Document upload / re-send | `presign-upload`, PUT, `confirm-upload`, `reenviar` | A pending test account (above); sample image < 6 MB and PDF < 12 MB with dummy content; for re-send, an operator must first reject one test document |
| Profile edit | `PUT {AUTH}/v1/auth/profile`, `PATCH /v1/licenciados/{id}` | A test licenciado whose name/phone may change (and be restored) |
| Preferences / consents | `PUT /v1/licenciado-settings/me/preferences` | Test licenciado; agreement that LGPD consent values on it are test values |
| Notification preferences | `PUT /v1/licenciado-settings/me/notification-preferences` | Test licenciado |
| Marketplace redeem / cancel | `POST /v1/pedidos`, `POST /v1/pedidos/{id}/cancel` | `features.marketplace=true` for a test licenciado, a test product, a **test points balance**; cancel right after redeeming |
| Notification mark read / all | `POST /v1/notifications/me/{id}/read`, `…/read-all` | Test account with at least 2 unread notifications (low risk, but it changes the client account's inbox) |
| Support ticket create / reply / resolve | `POST /v1/support/tickets`, `…/messages`, `PATCH …/status` | Test account + support team informed the ticket is a test (it reaches the real support queue) |
| Ticket from client | `POST /v1/support/tickets` (with client id) | Test licenciado with a test client |
| Alert read / resolve | `POST /v1/dashboards/licenciado-central/{id}/alerts/{alertId}/read\|resolve` | Test licenciado with at least one test alert (resolving hides it for the real user) |
| Session termination | `DELETE /v1/auth/sessions/me/{id}`, `DELETE /v1/auth/sessions/me` | Test account logged in on a second device/browser; never the client account (ends their real sessions) |
| Lesson completion | `POST …/lessons/{id}/complete` | Test account + a published test course |
| Account-deletion request | `POST /v1/auth/account/delete-request` | Disposable test account only; operator to cancel the request |

---

## 4. Request to the client / backend team

**Subject: ACVEL Licenciado app — homologation data and backend items for the demo and QA**

The app is feature-complete for the demo. To test every screen with real data, we need the following on the
homologation environment.

**Test data (for the existing test licenciado, unless stated):**
1. **Commissions** in several statuses (Pendente, Liberada, Paga, Cancelada) across 2–3 competências.
2. **A paid payment batch** (status PAGO) **with a receipt**, ideally also one with a divergence or failure.
3. **A representative linked to this licenciado**, with its own login, and at least one document.
4. **A fresh pending licenciado** account (registered, onboarding not started).
5. **A fresh pending representative** account, linked to a test licenciado.
6. **A client with documents** (energy bill / ID).
7. **Published Academy courses** with lessons (and materials).
8. **Marketplace:** `features.marketplace = true` in `/v1/auth/me` for the test account, a few products and a
   points balance.
9. **A support ticket** with at least one reply from the support team.
10. **A licenciado contract** (ZapSign), ideally awaiting signature, to show the banner.
11. **WhatsApp support number** (`phoneE164`) in `client-configuracoes/whatsapp-atendimento`.
12. **kWh available** for the account's region (`kwh_disponivel_regiao`).

Also, please confirm the URLs to configure: consumer app (Minhas Faturas / client signup link), licenciado web
portal (representative invite link), terms of use and privacy policy.

**Backend gaps (separate from data):**
1. **`GET /v1/app/status`** — missing (404); needed for remote maintenance mode.
2. **Marketplace feature flag** — `/v1/auth/me` has no `features.marketplace`.
3. **Training permission** — no training resource in the permission list; the app currently follows the portal
   (Academy visible to licenciados/representatives). Please confirm or add the permission.
4. **Invitations** — `GET /v1/sublicenciados/convites` returns 400 (`uuid is expected`); should be 404 or an
   empty list. There are also no invitation create/revoke routes.
5. **Representative profile update** — no self-update endpoint for representatives.
6. **Support attachment upload** — no endpoint; tickets are text only.
7. **Push device-token endpoint** — none; push notifications cannot be registered.
8. **Unknown user** — a valid Firebase token for a user missing in the system returns 401
   (`Usuario nao encontrado no sistema`); it should be 403 with an error code so the app can show the right
   screen instead of logging out.
