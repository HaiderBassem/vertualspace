# Adminspace

Adminspace is a self-hosted administration back office for [WorkAdventure](https://github.com/workadventure/workadventure).
It also implements WorkAdventure's **Admin API**, the HTTP contract WorkAdventure calls when
`ADMIN_API_URL` is set.

It is an original, independent project. It is not affiliated with WorkAdventure SAS and is not a copy
of their hosted administration (admin.workadventu.re): it shares no code, text or design with it. It
implements the open Admin API contract that is documented in WorkAdventure's open-source repository.

## Features

- **Organizations, workspaces, worlds and rooms.** Rooms are served at `/@/{organization}/{world}/{room}`.
  Workspaces group an organization's worlds (by department or site) and have their own managers. Each room
  can use a map-storage (`.wam`) or Tiled (`.tmj`) map, have a default room, and require tags to enter.
- **Onboarding.** Public registration with email verification (when the platform opens it), invitations by
  email with a role and workspace access (single use, expiring, revocable), password reset by email. Without
  email delivery configured, the pages say so and invitation links are shown to share by another channel.
- **Teams.** Invite, change roles, suspend, remove, in bulk with a report of each refusal; the last owner is
  protected and ownership changes hands through an audited transfer. Employees get a home with their offices
  and colleagues, without administration.
- **Office components.** A catalog of furniture and room templates (original artwork, see
  `catalog/builtin/README.md`) with search, categories, favorites and previews. Installing a component adds it
  to WorkAdventure's map editor in the world's rooms; templates create furnished rooms. Organizations can
  upload their own validated packages. Changes in WorkAdventure run as retried background jobs.
- **Desks.** Every employee can have a desk in WorkAdventure and decorate it by drag and drop. Administrators
  see all desks on a floor plan, assign, reserve, free and take desks out of service, add them in bulk, and
  desks are freed when a person leaves. Desks live only in the maps (no second database); see `docs/DESKS.md`.
- **Access control for players.** Worlds can be public, open to logged-in people only, or reserved to
  members. Bans work by identifier or IP address, with an optional duration. Worlds can have a capacity,
  an expiry date and an archived state.
- **Members and tags.** Guests are recorded automatically. You can search, import and export members
  (CSV), and export or erase a person's data (GDPR articles 15 and 17). Employee profiles (job title,
  department, manager, work location) are shared by the organization's worlds; see `docs/MEMBERS.md`.
- **Who's in.** A live page of the people connected to the organization's worlds right now, by world and room,
  with their status, reported by WorkAdventure's pushers (`POST /api/presence/report`); see `docs/PRESENCE.md`.
- **Moderation.** Reports sent from inside WorkAdventure arrive in the back office. Bans can be made
  in-game or from the back office, which also disconnects the person live.
- **Live view.** People online per room, live list of who is connected, messages broadcast to rooms, and
  room reloads.
- **World settings.** Branding, feature toggles, avatar policies, map-editor and recording permissions,
  Jitsi/BigBlueButton/LiveKit, embedded applications, legal links, meta tags, privacy and retention.
- **Control Center.** Platform figures, organizations (suspension, owner invitation, time-limited and audited
  support access), accounts, the component and avatar catalogs, background jobs, email deliveries, instance
  settings (WorkAdventure URLs, map-storage, ICE servers, LiveKit, registration), system status and the audit
  log. Platform administrators have no right inside an organization without a support access.
- **Integration Center.** Calendars (Google, Microsoft 365) shown in WorkAdventure, office events posted to Slack,
  Discord, Teams, Zapier, n8n and signed webhooks (delivery log, retries, test events), GitHub/GitLab activity,
  Spotify "now playing" (opt-in), Notion/Trello/Miro boards to place in rooms, an automation API with scoped tokens,
  and "My integrations" where each person connects their own accounts. Tokens are sealed, nothing is shown as
  connected before the provider answered. See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).
- **Integrations.** Room API keys and custom domains.
- **Security.** One authorization policy with owner, admin, moderator, viewer and employee roles, plus
  workspace managers; strict tenant isolation. Passwords are hashed with argon2id, TOTP two-factor
  authentication is available, and an audit log records every change.
- **International.** English, French, German, Spanish and Arabic (right to left). Locales follow BCP 47
  and negotiation follows RFC 4647. Dates use ISO 8601 and are shown in each person's time zone;
  countries use ISO 3166-1. See [docs/STANDARDS.md](docs/STANDARDS.md).

## Quick start

Requirements: Node.js 22.12 or later, Docker (for PostgreSQL), and a WorkAdventure checkout next to
this folder, used to import the avatar catalog and to sync the contract.

```sh
docker compose up -d db                 # PostgreSQL 17 on localhost:5433
cp .env.example .env                    # then set ADMIN_API_TOKEN and APP_SECRET
npm install
npm run db:migrate
npm run db:seed -- --demo               # avatar catalog + demo world /@/demo/office/lobby
npm run catalog:import                  # publish the built-in office components
npm run dev                             # http://localhost:4000
```

Open <http://localhost:4000/setup> to create the first superadmin account.

## Connecting WorkAdventure

Set `ADMIN_API_URL` and the same `ADMIN_API_TOKEN` on WorkAdventure's play and back services, then
restart them. The full procedure, including a compose override for WorkAdventure's development stack, is
in [docs/INTEGRATION.md](docs/INTEGRATION.md) and [integration/README.md](integration/README.md).

## Scripts

| Command                                                                             | Description                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                                                       | Development server on port 4000                                     |
| `npm run build` / `npm start`                                                       | Production build / start (`node build/index.js`)                    |
| `npm run db:generate`                                                               | Generate a SQL migration from `src/lib/server/db/schema.ts`         |
| `npm run db:migrate`                                                                | Apply pending migrations                                            |
| `npm run db:seed [-- --demo]`                                                       | Import WorkAdventure's avatar catalog (and a demo world)            |
| `npm run superadmin:create`                                                         | Create a superadmin from the command line                           |
| `npm run catalog:generate`                                                          | Regenerate the built-in component pack (`catalog/builtin`)          |
| `npm run catalog:import`                                                            | Validate and publish the built-in component pack                    |
| `npm run contract:sync`                                                             | Copy WorkAdventure's Admin API schemas from `$WORKADVENTURE_REPO`   |
| `npm run contract:check`                                                            | Fail if the vendored schemas differ from the WorkAdventure checkout |
| `npm run i18n:check`                                                                | Report missing or untranslated messages                             |
| `npm test`                                                                          | Unit and contract tests (Vitest; contract tests need the database)  |
| `npm run typecheck`, `npm run svelte-check`, `npm run lint`, `npm run pretty-check` | Static checks                                                       |

## Project structure

```
.
├── docs/                       architecture, Admin API, standards, integration
├── docker/entrypoint.sh        runs migrations, then the server
├── drizzle/                    SQL migrations
├── integration/                compose override for WorkAdventure's stack
├── scripts/                    migrate, seed, contract sync, i18n check
├── src/
│   ├── hooks.server.ts         locale, session, access guard, security headers
│   ├── lib/
│   │   ├── components/         accessible UI components
│   │   ├── contract/           WorkAdventure's Admin API schemas (vendored) + mirrored shapes
│   │   ├── i18n/               locales (en, fr, de, es, ar), negotiation, formatting
│   │   ├── settings/           world and instance settings schemas
│   │   └── server/
│   │       ├── adminApi/       Admin API router, routes, handlers
│   │       ├── auth/           credentials, TOTP, sessions, RBAC
│   │       ├── db/             Drizzle schema and client
│   │       ├── http/           problem details, token check, forms
│   │       ├── services/       domain logic
│   │       └── workadventure/  play URL parsing, WorkAdventure error screens
│   └── routes/
│       ├── api/, oauth/, white-label/   Admin API entry points
│       ├── login/, setup/, logout/, locale/, profile/, healthz/, readyz/
│       └── (app)/              back office: worlds, organizations, o/[org]/…, admin/…, account
├── static/
├── tests/                      contract and unit tests
├── Dockerfile
└── docker-compose.yaml         PostgreSQL for development
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for request flows, the data model and the permission
matrix, and [docs/ADMIN_API.md](docs/ADMIN_API.md) for every endpoint.

## Production

```sh
docker build -t adminspace .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://… -e ORIGIN=https://admin.example.com \
  -e ADMIN_API_TOKEN=… -e ADMIN_SOCKETS_TOKEN=… -e APP_SECRET=… adminspace
```

The container applies migrations on start (`SKIP_MIGRATIONS=true` to disable), runs as a non-root user
and exposes `/healthz` (liveness) and `/readyz` (database readiness). Serve it over HTTPS: in production
the session cookie uses the `__Host-` prefix and HSTS is sent.

## License

No license has been chosen for this project yet.

`src/lib/contract/workadventure/` is copied from WorkAdventure's repository (`libs/messages`). It is
covered by WorkAdventure's license: AGPL-3.0, with the Commons Clause restrictions described in that
repository. Review the compatibility of these terms with your intended use and license before you
distribute Adminspace or offer it as a service.
