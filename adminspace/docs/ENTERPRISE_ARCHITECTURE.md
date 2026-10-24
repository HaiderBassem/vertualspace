# Enterprise architecture: research and decisions

This document records what was verified before the enterprise features (registration, invitations,
workspaces, delegated administration, support access, office component marketplace) were built, and
why the design is what it is. Request flows and the base data model are in [ARCHITECTURE.md](ARCHITECTURE.md);
security controls in [SECURITY.md](SECURITY.md).

## 1. Starting point (repository, 2026-10-23)

- One SvelteKit 2 (Node, adapter-node) application, Svelte 5 runes, TypeScript strict, PostgreSQL 17 with
  Drizzle, zod 3, Tailwind 4, Vitest, Playwright. Dev database on port 5433, dev server on port 4000.
- Already solid: argon2id passwords, TOTP with replay protection and recovery codes, hashed session
  tokens, shared PostgreSQL rate limits, audit log on every mutation, CSP, 5 locales with Arabic RTL,
  Admin API contract tests against WorkAdventure's own schemas, live tests against real WorkAdventure.
- Baseline before this work: typecheck, svelte-check (1108 files), ESLint, Prettier, i18n check, schema
  drift: all clean; Vitest 17 files / 162 tests passed; e2e 430 passed (last recorded run).
- Missing (documented as such in PRODUCTION_READINESS.md): invitations, self-service registration,
  email, password reset, employee experience, delegated administration, component catalog.
- A trust-boundary gap: superadmins held every permission in every organization implicitly.

The architecture was kept (no rewrite, no new framework, no second identity system). New capabilities are
new tables, services and routes in the same application.

## 2. Research findings

### WorkAdventure (verified in the source of commit b579166 and in the official docs)

| Finding                                                                                                                                                                                                                                                                                 | Source                                                                                                                    | Consequence for AdminSpace                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MapDetailsData.entityCollectionsUrls` is stored by the front (`Room.ts:223`) and **never read**. The inline editor loads only the collections listed in the room's **WAM file** `entityCollections` (`GameScene.ts:1870-1881`), plus the per-domain custom collection.                 | `play/src/front/Connection/Room.ts`, `play/src/front/Phaser/Game/GameScene.ts`                                            | Installing components must add a collection URL **to each room's WAM**, through map-storage. The existing world setting "entity collection URLs" (sent in MapDetailsData) has no effect on this WorkAdventure version; this is documented in the UI.             |
| The browser fetches each collection with `fetch(url)` (`EntitiesCollectionsManager.ts:202`); failures are logged and skipped (`Promise.allSettled`).                                                                                                                                    | `play/src/front/Phaser/Game/MapEditor/EntitiesCollectionsManager.ts`                                                      | Collection JSON and images are served with `Access-Control-Allow-Origin: *`. A broken collection never blocks a room.                                                                                                                                            |
| `imagePath` is resolved with `new URL(imagePath, collectionUrl)`; relative WAM collection URLs are not resolved against the WAM.                                                                                                                                                        | same, L93                                                                                                                 | Collection URLs written into WAMs are absolute; image paths are absolute too.                                                                                                                                                                                    |
| Prefab lookup is by `id` only, ignoring `collectionName` (`getEntityPrefab`, L48-51).                                                                                                                                                                                                   | same                                                                                                                      | Prefab ids are globally unique and stable across versions: `adminspace.<component>.<variant>`.                                                                                                                                                                   |
| Collection schema: `{collectionName, tags, collection: EntityRawPrefab[], version?}`; prefab `{id, name, tags, imagePath, direction: Left/Up/Down/Right, color, collisionGrid?, depthOffset?}`. Files without `version` get their ids rewritten (v0 migration).                         | `libs/map-editor/src/types.ts:293-332`, `Migrations/EntitiesFileMigration.ts`                                             | Collections are emitted with `"version": "1.0"` so ids are kept.                                                                                                                                                                                                 |
| Image sizes are free, but collidable entities should be multiples of 32 px; each collision cell is 32×32.                                                                                                                                                                               | `docs/map-building/inline-editor/entity-collection-file-format.md`                                                        | The component manifest validates dimensions against the collision grid.                                                                                                                                                                                          |
| WAM placed entities reference prefabs by `prefabRef {collectionName, id}`; unknown top-level keys are stripped; `vendor` (unknown) is the place for admin data.                                                                                                                         | `libs/map-editor/src/types.ts:335-438`                                                                                    | Uninstalling a component checks the room WAMs for placed instances of its prefab ids first. Template provenance goes into `vendor`.                                                                                                                              |
| map-storage REST: `PATCH /<path>.wam` (JSON Patch, validated), `PUT` (text only: **binary files are corrupted**), `POST /upload` (ZIP, **deletes the target directory first**), `GET /maps` (no auth). Inbound auth: Bearer `AUTHENTICATION_TOKEN` (or validator URL / Basic / Digest). | `map-storage/src/Upload/UploadController.ts`, `Services/Authentication.ts`, docs.workadventu.re/developer/map-storage-api | WAM updates use `PATCH` with a JSON Patch `test` precondition (optimistic concurrency). Room templates are uploaded as a ZIP into a **dedicated per-room directory**, so nothing existing can be wiped. These calls run as durable jobs (retry, reconciliation). |
| Edit rights come from `canEdit` in `/api/room/access`; with an Admin API the `MAP_EDITOR_*` variables are ignored.                                                                                                                                                                      | `play/src/pusher/services/AdminApi.ts:89-91`                                                                              | Who may place furniture stays governed by the world's map-editor permission (now also satisfied by employees when the policy is "members").                                                                                                                      |
| The bundled furniture/office collections (`play/public/collections/`) have no separate license; the play package is AGPL-3.0 + Commons Clause. The map-starter-kit tilesets forbid redistribution outside WA maps. LimeZu packs forbid redistribution.                                  | `play/LICENSE.txt`; github.com/workadventure/map-starter-kit `LICENSE.assets`; limezu.itch.io                             | AdminSpace ships **original** assets only (drawn by code in `scripts/catalog/`, licensed with the project), with per-asset provenance. WorkAdventure's own collections are never copied.                                                                         |

### Security references

- OWASP Multi-Tenant Security Cheat Sheet: the tenant in a URL only selects; rights come from the verified
  membership; scope every query, cache key and job; re-authorize in job consumers; cross-tenant access by
  platform operators must be explicit, separately authorized and audited; test isolation negatively.
- AWS SaaS authorization guidance: separate policy decision (PDP) from enforcement (PEP); a hybrid of roles
  and resource attributes (tenant, workspace) suits overlapping, delegated permissions.
- OWASP Forgot Password / Authentication cheat sheets: CSPRNG tokens, single use, short expiry, stored
  hashed; links built from a configured host, never the Host header; identical answers (content and timing)
  whether an account exists; `Referrer-Policy: no-referrer` on token pages; no change before a valid token;
  notify after a reset; do not log in automatically after a reset.

### Product patterns borrowed

- Logto / Plane: role chosen at invitation time; one open invitation per address and organization;
  admins grant roles below admin only; nobody changes their own role; removing the last owner is refused;
  suspended members stay visible.
- Zitadel: organization switcher; verified domains (already implemented here with DNS TXT).

## 3. Decisions

### Domain model

```
organization ─┬─ workspace ── world ── room            (WorkAdventure sees /@/{organization}/{world}/{room})
              ├─ membership (account × role × status)
              ├─ workspace membership (account × workspace × manager|member)
              ├─ invitation (email × role × workspaces)
              └─ component installations (world × component version)
```

- **Workspace** is an AdminSpace-only grouping of worlds (a department, a site): the unit of delegated
  administration and of employee access. Every organization has at least one; existing worlds were moved
  into a localized "main" workspace by migration 0002. Moving a world between workspaces never changes its
  WorkAdventure address. Composite foreign keys `(organization_id, workspace_id)` make it impossible, in
  the database, for a world or an assignment to point at another organization's workspace.
- **Rooms** stay as they were (map-storage WAM or Tiled TMJ).

### Authorization (src/lib/server/auth/rbac.ts)

- One policy decision point: `PERMISSIONS` (organization roles) + `WORKSPACE_PERMISSIONS` (workspace
  roles, applied only within that workspace) + `SUPPORT_PERMISSIONS`. Enforcement points: `loadOrganization`
  and `loadWorld` (src/lib/server/context.ts), called by every load and every action.
- Roles: `owner`, `admin`, `moderator`, `viewer` (unchanged meaning) and new `employee` (no administration);
  workspace `manager` (delegated administration of that workspace's worlds) and `member` (entry).
- Role-permission mapping is sufficient for organization-wide rights; the one resource-based rule is the
  workspace scope (evaluated with the world's workspace id). Who may change whose role is a separate
  rule (`grantableRoles`: owners everyone, admins the roles below admin), evaluated under lock on the
  actor's current role.
- **Platform trust boundary:** a platform administrator holds no right in an organization they are not a
  member of. They request a **support access grant** (reason, 1 hour, audited, visible to them as a banner)
  that gives `SUPPORT_PERMISSIONS`: configuration and moderation, never team, ownership, integrations or
  secrets. Platform-level lifecycle actions (suspend, delete) stay in the Platform Control Center.
- PostgreSQL Row-Level Security was evaluated and **not adopted now**: every service would need a
  transaction-local tenant context (`SET LOCAL`) on a pooled connection, which this codebase does not have;
  isolation is enforced by the central loaders, explicit organization filters in every service, composite
  foreign keys, and negative tests. RLS remains a defense-in-depth option (see section 5).

### Identity and onboarding

- The existing account/session system is the identity system; no second one was added.
- Registration (`/register`, closed by default) stores a signup request; the account, organization,
  owner membership and first workspace are created in one transaction when the emailed link is confirmed
  (POST). Answers do not reveal whether an address has an account; emails are sent after the answer.
- Invitations (`/invite?token=`), password reset (`/forgot-password`, `/reset-password?token=`): 256-bit
  tokens, SHA-256 stored, single use, expiring; tokens travel in query strings because request logs record
  paths only.
- Email: SMTP (`SMTP_URL`, `MAIL_FROM`) through nodemailer; no vendor API. Without it nothing is pretended:
  invitation links are shown to the inviter, verified registration and email reset report themselves
  unavailable. Every attempt is recorded in `email_deliveries` without its body.
- Employees enter worlds through WorkAdventure's own login (OpenID Connect configured on WorkAdventure):
  the Admin API matches the email WorkAdventure sends with an active employee of the world's workspace.
  AdminSpace is **not** an OpenID provider (external dependency, documented).

### Cross-system changes

Changes to WorkAdventure state (WAM patches, template uploads) are recorded as **jobs** in the same
transaction as the local change, then run by an in-process worker (`SKIP LOCKED`, bounded concurrency,
exponential backoff with jitter, idempotency keys, tenant re-check). No network call is made inside a
database transaction. Failed jobs are visible (room status, Platform › Jobs) and can be retried; a
reconciliation compares installations with the WAMs and repairs drift.

## 4. Work status

Verification evidence is in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

Implemented and verified (unit, database, end-to-end tests; see `docs/TESTING.md`):

- Schema 0002 (workspaces, employee role, statuses, invitations, signup requests, password resets, email
  log, support grants, jobs) and 0003 (assets, components, versions, installations, favorites, collections,
  room sync state), tested on throwaway databases (fresh install and upgrade with data).
- Policy (`auth/rbac.ts`), loaders (`context.ts`), request context and support attribution in `audit()`.
- Onboarding (registration with verification, invitations, password reset, email log), team (roles,
  suspension, removal, bulk with a report, leave, ownership transfer), workspaces (create, archive, restore,
  delete when empty, managers and members, move a world), employee home and directory.
- Control Center: figures, organizations (suspension, owner invitation, support access), component catalog,
  background jobs, email deliveries, registration settings.
- Components: catalog (search, categories, kind, sort, favorites), detail with previews, install, update,
  uninstall (refused while placed), room from template, organization upload, world "Components" page (per-room
  state, translated failure reason, check and repair), new and re-pointed rooms linked automatically.
- Durable jobs with retries, idempotency and reconciliation; retention of onboarding links, email records
  (90 days) and finished jobs (30 days).
- Built-in pack: 28 original entities and 4 room templates (`catalog/builtin`), published by an explicit
  command; verified in the production image.
- 5 locales (Arabic with every CLDR plural form), RTL, responsive at 375 px.

Verified against the real WorkAdventure map-storage (`integration/live-test/components-scenario.ts`):
template upload, collection link, real JSON Patch, reconciliation without duplicates.

Not verified: WorkAdventure's map editor in a browser showing the furniture (format checked against its
schema instead); a real SMTP provider; real ACME certificates.

## 5. Deferred, with reasons

- **Row-Level Security**: see above; requires a tenant-context layer across all services.
- **AdminSpace as OpenID Connect provider** for WorkAdventure logins: large security surface; WorkAdventure
  works with any OIDC provider today.
- **SSO (OIDC/SAML) into the back office**: not required by the current deployments; accounts are local.
- **Billing and quotas**: no billing exists; usage counts are shown, no limits are enforced.
- **Feature flags / rollout controls**: no feature currently needs staged rollout.
