# Restaurant Shifts — Backend (MVP scaffold)

NestJS + TypeORM + PostgreSQL backend for the Telegram Mini App described in
the TOR ("Telegram Mini App для управління змінами персоналу ресторанів").

This is a **scaffold**: the module structure, database schema, REST routes,
WebSocket events, and core business rules (booking conflicts, replacement
workflow, Telegram auth) are implemented. Some pieces are marked `TODO` —
mainly notification recipient resolution and the recommendation engine
(TOR section 14), which need product decisions before they can be built.

## ⚠️ Before you do anything else

A Telegram bot token was shared earlier in plain text. **Treat it as
compromised.** In Telegram, message **@BotFather** → `/mybots` → select your
bot → **API Token** → **Revoke current token**, then put the *new* token into
your local `.env` file (never into source control or chat).

## Project layout

```
src/
  main.ts                  # bootstrap, validation pipe, Swagger
  app.module.ts             # wires all feature modules together
  config/                   # TypeORM config factory
  database/                 # data-source.ts (CLI migrations), seed.ts
  common/
    guards/                 # JwtAuthGuard, RolesGuard, passport strategy
    decorators/              # @Roles()
    filters/                 # global HTTP exception filter
  modules/
    auth/                    # POST /auth/login — verifies Telegram initData, issues JWT
    users/                   # users table (telegram_id, role, ...)
    restaurants/             # CRUD + "import from Google Maps" (TOR §6)
    positions/                # job positions per restaurant (waiter, cook, ...)
    employees/                # join of restaurant + user + position
    shifts/                   # CRUD, booking, "can't make it" → replacement request
    replacement-requests/     # candidates apply, admin approves
    notifications/            # in-app + Telegram push, listens to domain events
    statistics/                # worked hours / shifts / expected salary per month
    telegram/                  # Telegram Bot API wrapper (sendMessage, setWebhook)
    events/                    # Socket.io gateway emitting the events in TOR §20
```

## Database schema

Entities mirror TOR section 18 (`users`, `restaurants`, `employees`,
`positions`, `shifts`, `shift_employees`, `replacement_requests`,
`notifications`, `statistics`), with a few extra columns the spec implies
elsewhere (e.g. `working_hours` JSON on restaurants, `is_urgent` on shifts)
and proper foreign keys/relations instead of bare ids.

`synchronize: true` is on by default outside production so the schema
auto-creates for local development. Switch to migrations
(`npm run migration:generate` / `migration:run`) before going to production
or once there's real data to protect.

## Getting started

```bash
cp .env.example .env        # fill in DB + JWT_SECRET + new TELEGRAM_BOT_TOKEN
docker compose up -d postgres
npm install
npm run start:dev
```

API will be on `http://localhost:3000`, Swagger docs on `/docs`.

## REST API (TOR §19)

All routes implemented under `/auth`, `/restaurants`, `/employees`,
`/positions`, `/shifts` (plus `/shifts/:id/book` and
`/shifts/:id/cannot-make-it`), `/replacement` (plus `/replacement/:id/apply`),
`/notifications`, `/statistics`. Protected routes require
`Authorization: Bearer <JWT>` obtained from `POST /auth/login`.

## WebSocket events (TOR §20)

Socket.io namespace `/events`. Clients should emit `join_restaurant` and/or
`join_user` right after connecting to scope which rooms they receive:
`shift_created`, `shift_updated`, `shift_deleted`, `emergency_shift`,
`replacement_request`, `replacement_accepted`, `notification_created`.

## What's stubbed / needs follow-up

- **Notification recipient resolution** — `NotificationsService` listens for
  domain events (emergency shift, replacement requested/accepted) but the
  "which employees/admins to notify" lookup is a `TODO`. Needs a query like
  "all active employees at restaurant X with position Y".
- **Recommendation engine** (TOR §14) — not started; needs a clearer rule
  (e.g. "desired_shifts_per_month - worked_shifts_this_month > 0").
- **Telegram webhook endpoint** — `TelegramService.setWebhook()` exists but
  there's no `POST /telegram/webhook` controller yet for inbound bot
  commands (e.g. a `/start` deep link into the Mini App).
- **Multi-candidate replacement requests** — current schema stores a single
  `candidate_employee_id`; if you want the admin to choose among several
  applicants, add a `replacement_candidates` join table.
- **Frontend** — this scaffold is backend-only, per your request.
