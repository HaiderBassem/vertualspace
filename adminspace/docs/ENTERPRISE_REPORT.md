# AdminSpace enterprise work — final report (2026-10-23)

Status words used below: **implemented** (code in place), **verified** (an automated or live check
exercised it, named), **partial** (works with a named limit), **planned** (not built).

## 1. Executive summary

AdminSpace grew from a WorkAdventure back office with owner-managed teams into a multi-tenant platform:
self-service onboarding with email verification, invitations, workspaces with delegated managers, an
employee experience, a Control Center for the platform with audited support access instead of implicit
superadmin rights, and an office component marketplace whose furniture and room templates reach
WorkAdventure's map editor through map-storage, with durable retried jobs.

Everything listed as verified passed in the final run: 229 unit/integration/contract/lifecycle tests,
472 end-to-end tests on the production build (including the 10 required journeys), all static checks,
and a live scenario against WorkAdventure's real map-storage. The recommendation stays **ready for
staging only**: licensing, an external security assessment, a real SMTP provider and a browser check of
WorkAdventure's map editor are still open (section 13).

## 2. Findings (starting point)

- SvelteKit 2 + Svelte 5, TypeScript strict, PostgreSQL 17 + Drizzle, Vitest, Playwright; solid
  authentication (argon2id, TOTP, hashed sessions, shared rate limits), audit log, 5 locales with RTL,
  Admin API contract tests against WorkAdventure's schemas, live tests against real WorkAdventure.
- Baseline: all static checks clean; Vitest 17 files / 162 tests; e2e 430 passed.
- Missing: invitations, registration, email, password reset, employee experience, delegated
  administration, component catalog. Trust gap: superadmins implicitly held every permission in every
  organization.
- Kept: the architecture and the identity system (no rewrite, no second identity system).

## 3. Research (with links)

WorkAdventure, read in the official docs and verified in the source (commit `b57916667f0f`), details with
file:line evidence in [ENTERPRISE_ARCHITECTURE.md](ENTERPRISE_ARCHITECTURE.md) §2:

- Admin and members: <https://docs.workadventu.re/admin/>, <https://docs.workadventu.re/admin/members>,
  <https://docs.workadventu.re/admin/manage-access>
- Map building and inline editor: <https://docs.workadventu.re/map-building/>,
  <https://docs.workadventu.re/map-building/inline-editor/>,
  <https://docs.workadventu.re/map-building/inline-editor/entity-editor/>,
  <https://docs.workadventu.re/map-building/inline-editor/entity-collection-file-format>
- Developer APIs: <https://docs.workadventu.re/developer/>, <https://docs.workadventu.re/developer/map-storage-api/>,
  <https://docs.workadventu.re/developer/room-api>, <https://docs.workadventu.re/developer/inbound-api>
- Source: <https://github.com/workadventure/workadventure> (Admin API doc
  `docs/others/self-hosting/adminAPI.md`, WAM schema `docs/schema/2.1.0/wam.json`, map-storage
  `UploadController.ts`, `play/public/collections`, `play/LICENSE.txt`), map starter kit
  <https://github.com/workadventure/map-starter-kit>
- Security: OWASP Multi-Tenant Security
  <https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html>, Authentication
  <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>, Forgot Password
  <https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html>, Session Management
  <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>; AWS SaaS
  authorization <https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/introduction.html>
  (PDP/PEP, access control types, best practices)
- Product patterns: Logto invitations and organization experience
  <https://docs.logto.io/end-user-flows/organization-experience/invite-organization-members>, Zitadel
  organizations <https://zitadel.com/docs/concepts/structure/organizations>

Findings that shaped the design: WorkAdventure's editor reads collections only from each room's **WAM file**
(the map-details setting is ignored); map-storage `POST /upload` empties the target directory first; WAM
changes go through validated JSON Patch; WorkAdventure's bundled collections and common pixel-art packs
cannot be redistributed, so the pack is original.

## 4. Decisions

- Tenant model organization › workspace › world › room; workspaces are AdminSpace-only (WorkAdventure URLs
  unchanged); composite foreign keys keep every child inside its organization.
- One policy decision point (`auth/rbac.ts`) with organization roles, workspace-scoped roles and support
  permissions; enforcement in every load and action (`loadOrganization`/`loadWorld`).
- Platform administrators get no organization rights; time-limited, justified, audited support access.
- Durable jobs outbox for every change in WorkAdventure (no network call inside a transaction),
  idempotent handlers, optimistic concurrency on WAM patches.
- Content-addressed, immutable component versions; strict manifest; raster images only, sniffed by bytes.
- SMTP through nodemailer 10.0.15 (no paid dependency); honest behaviour without email.
- Row-level security evaluated and not adopted now (documented in ENTERPRISE_ARCHITECTURE.md).

## 5. Features

| Area                        | Status                            | Notes and evidence                                                                                          |
| --------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Registration + verify       | implemented, verified             | single transaction under row lock; anti-enumeration; e2e 1, `enterprise.db.test.ts`                         |
| Invitations                 | implemented, verified             | expiry, revocation, resend (old link dies), single use, workspaces; e2e 2, both DB test files               |
| Password reset by email     | implemented, verified             | 30 min, ends sessions, no auto-login; services test (the email step itself: sink only)                      |
| Team management             | implemented, verified             | roles, suspension, removal, leave, bulk with per-person report, last-owner guard, transfer; e2e 9, services |
| Workspaces                  | implemented, verified             | create, archive/restore, delete when empty, managers/members, move a world; e2e 3, 6, services test         |
| Employee home, directory    | implemented, verified             | e2e 4, 10                                                                                                   |
| Tenant isolation            | implemented, verified             | negative tests at service and HTTP level; e2e 5, tenant/authz suites (184 authz tests)                      |
| Support access              | implemented, verified             | e2e 5, `enterprise.db.test.ts`                                                                              |
| Control Center              | implemented, verified             | figures, security events, organizations, components, jobs, email; axe and i18n on its pages                 |
| Component catalog           | implemented, verified             | search, categories, kind, sort, favorites, previews; e2e 7, services test                                   |
| Install / update / remove   | implemented, verified             | removal refused while placed or unverifiable; services and DB tests                                         |
| Room templates              | implemented, verified live        | real map-storage upload accepted (live scenario); not in automated tests                                    |
| Organization uploads        | implemented, verified             | e2e upload journey (SVG refused with its reason), services test                                             |
| Jobs and reconciliation     | implemented, verified             | e2e 8, DB test; live reconciliation against real map-storage                                                |
| i18n (5 locales), RTL       | implemented, verified             | i18n suite, Arabic plural test, e2e 10                                                                      |
| Accessibility               | implemented, verified (automated) | axe on 31 pages in en-US and ar-SA; no manual assistive-technology review                                   |
| Named component collections | planned                           | tables exist (`component_collections`), no service or page                                                  |
| Map editor in a browser     | partial                           | format checked against WorkAdventure's schema; nobody opened the editor in a browser                        |

## 6. Database changes

- `drizzle/0002_enterprise_foundation.sql`: `employee` role; organization logo, color, status; membership
  status, inviter; `workspaces`, `workspace_memberships`, `invitations`, `invitation_workspaces`,
  `signup_requests`, `password_resets`, `email_deliveries`, `support_access_grants`, `jobs`;
  `accounts.email_verified_at`; `worlds.workspace_id` (backfilled with one localized "main" workspace per
  organization, then NOT NULL).
- `drizzle/0003_component_catalog.sql`: `assets` (content-addressed bytes), `components`,
  `component_versions`, `component_version_assets`, `component_installations`, `component_favorites`,
  `component_collections`, `component_collection_items`; room sync state. Full-text GIN index on names and
  descriptions, GIN on tags.
- Both tested on throwaway databases (fresh install and upgrade from `0000` with data); schema drift: none.

## 7. Security and negative tests

Controls are listed in [SECURITY.md](SECURITY.md) (new rows: cross-tenant access, lock-out, invitation and
registration abuse, secret links, malicious packages, served files, credentials of WorkAdventure, concurrent
map edits; credential rotation table). Negative tests include: other organization → 404 for every page and
action; platform administrator without support → redirected; support never reaches API keys or domains;
employee refused 8 administrative pages and 4 actions; manager refused another workspace, world creation
outside it and world moves; admin cannot manage owners or admins (bulk too); last owner cannot leave or be
demoted; invitation reuse, revoked, other account and forbidden role; registration double click; expired and
reused reset links; SVG-as-PNG, path traversal, ZIP bombs, wrong collision grids, external tilesets; job errors
scrubbed of credentials; a foreign workspace id as move target.

### Independent security review (before commit)

Two read-only reviews of the whole change set (authorization and onboarding; catalog, uploads, jobs and
deployment) found no critical issue and no cross-tenant read path. Fixed, each with a regression test:

- **High:** an organization could point a room at another tenant's map and have AdminSpace write to it with
  the platform's map-storage token. AdminSpace now writes only maps the organization owns (its own
  `adminspace/{organization id}/` directory, or maps no other organization's room uses), re-checked by the job;
  such rooms are refused and the map picker hides other organizations' directories.
- **High:** a platform password reset showed a password to the administrator, invisibly to the organization.
  With email it now sends a link to the person (the old password stops working); every platform action on an
  account is written to the audit logs of the person's organizations.
- **Medium:** percent-encoded `..` in map URLs; owner rights grantable without the password (now only through
  the transfer; deleting an organization asks for the password); no limits on component changes (hourly
  budget and upload storage quota per organization); invitation limits counted per request (now per address,
  resends included); support access could export or erase members' data, change workspace access and overwrite
  secrets (removed).
- **Low:** media type of shared assets decided by the first uploader (now from the bytes; images only for image
  fields); `javascript:` provenance links; corrupt archives and deeply nested maps answered 500; template job
  payload trusted (directory and versions re-derived); support grant could outlive a failed audit entry;
  loose invitation addresses; files of drafts and suspended organizations still served; email links could
  follow the Host header in a misconfigured development deployment.
- Kept as documented trade-offs: registration discloses taken slugs (public in WorkAdventure URLs); the
  "unverified address" rule for world entry was evaluated and not adopted (entry matches the address the
  identity provider verified, which the organization invited).

## 8. WorkAdventure compatibility

- Collection format: parsed with a strict copy of WorkAdventure's `EntityCollectionRaw`/`EntityRawPrefab`
  (`libs/map-editor/src/types.ts` at `b57916667f0f`) in `enterprise.db.test.ts`; cross-origin headers
  checked in e2e 7.
- Map-storage: `integration/live-test/components-scenario.ts` against
  `thecodingmachine/workadventure-map-storage:master`: template ZIP accepted by its validator, WAM lists
  the collection and 10 placed entities, real JSON Patch accepted, reconciliation restores a removed
  reference exactly once (8/8).
- Not exercised: WorkAdventure's map editor in a browser listing the furniture; an outage of the real
  map-storage (outages tested with fakes only).
- Admin API: employees of a world's workspace enter members-only worlds; suspended organizations refused
  (`ORGANIZATION_SUSPENDED`); rooms still being provisioned answer `ROOM_NOT_READY`.

## 9. Component catalog contents and licenses

28 entities with 78 variants and 4 room templates, version 1.0.0, 632 KB, generated by
`npm run catalog:generate` (`scripts/catalog/`):

- desks: desk-classic (4), desk-standing (3); seating: office-chair (12); meeting: meeting-table (3),
  round-table (3); lounge: sofa (8), armchair (4), coffee-table (3); reception: reception-desk (3);
  plants: plant-large (3), plant-small (3); decoration: bookshelf (3), rug (4), wall-art (3); lighting:
  floor-lamp (2); presentation: presentation-screen, whiteboard; computers: dual-monitor, laptop, printer;
  interactive: coffee-machine, vending-machine, water-cooler; navigation: exit-sign (2), glass-door;
  wayfinding: floor-arrow (4), signpost, tactile-paving.
- Templates: open-office (22×14 tiles), meeting-room (12×10), reception-lobby (16×11), lounge (14×10),
  with an original tileset.
- Provenance: original artwork drawn in code; no third-party asset copied or adapted.
- License: `LicenseRef-AdminSpace`, the terms of AdminSpace itself, **not decided yet**
  ([LICENSING.md](LICENSING.md)); the owners may dedicate the pack to CC0-1.0 independently.

## 10. Test commands and exact results (final run)

| Command                                                 | Result                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run pretty-check`                                  | clean                                                                                                             |
| `npm run lint`                                          | 0 problems                                                                                                        |
| `npm run typecheck`                                     | 0 errors                                                                                                          |
| `npm run svelte-check`                                  | 1286 files, 0 errors, 0 warnings                                                                                  |
| `npm run i18n:check`                                    | exit 0; identical-to-English warnings: fr 32, de 49, es 10, ar 3                                                  |
| `npm run contract:check`                                | in sync with WorkAdventure                                                                                        |
| `npx drizzle-kit generate`                              | no schema changes                                                                                                 |
| `REQUIRE_DB_LIFECYCLE_TESTS=true npx vitest run`        | 20 files, 229 passed                                                                                              |
| `npm run test:e2e` (+ a11y additions on the same build) | 472 passed, 0 failed (a11y 141, admin-api 10, auth 21, authz 184, enterprise 12, i18n 86, tenant 7, workflows 11) |
| live `components-scenario.ts`                           | 8/8 PASS                                                                                                          |
| `npm audit --omit=dev --audit-level=high`               | exit 0; 2 moderate (ts-deepmerge, unchanged baseline)                                                             |
| image: `migrate.js`, `catalog-import.js` twice          | uid 1000; migrated; 32 imported, then 32 up to date                                                               |

## 11. Performance measurements

`scripts/perf-measure.ts` on the production build (Node 26, macOS arm64, local PostgreSQL 17, e2e data set;
indicative only), sequential after warm-up, milliseconds:

| Endpoint                                    | p50 | p95 | max  |
| ------------------------------------------- | --- | --- | ---- |
| page `/o/{org}` (overview)                  | 6.1 | 7.4 | 11.1 |
| page `/o/{org}/components?q=desk`           | 4.6 | 7.7 | 21.4 |
| page `/o/{org}/components/{id}`             | 4.1 | 5.7 | 8.0  |
| page `/o/{org}/team`                        | 4.1 | 5.6 | 11.2 |
| `GET /wa/worlds/{id}/collection.json`       | 1.6 | 2.7 | 5.4  |
| `GET /wa/assets/…` (PNG)                    | 0.6 | 0.8 | 5.6  |
| Admin API `GET /api/map`                    | 1.0 | 1.1 | 1.7  |
| Admin API `GET /api/room/access` (employee) | 1.7 | 1.9 | 2.8  |

With 20 concurrent clients (400 requests): collection 2,167 req/s (p95 17.4 ms), `/api/map` 3,471 req/s
(p95 6.9 ms), `/api/room/access` 1,851 req/s (p95 12.4 ms). Pages in Chromium with an empty cache: 22–48
requests, 150–162 KB of JavaScript and about 9–10 KB of CSS uncompressed (Caddy compresses in production),
DOMContentLoaded 29–76 ms locally. Measured before the last label and test-only changes; no measured path
changed since.

## 12. Deployment

[DEPLOYMENT.md](DEPLOYMENT.md) (new settings, step 5b), [OPERATIONS.md](OPERATIONS.md) (jobs, email, catalog,
support access, alerts, retention), `deploy/Caddyfile` (20 MB only for the upload route, 2 MB elsewhere;
validated), `deploy/docker-compose.prod.yaml` (`BODY_SIZE_LIMIT=20M`, `JOB_WORKER`, SMTP pass-through;
validated), `.env.example` (all new variables). The built-in pack is published by an explicit command, never
at start-up.

## 13. Remaining issues and blockers

- **Blocking production:** licensing of AdminSpace and of the pack; no external security assessment; real
  deployment check (ACME, private network, backups) — unchanged from before.
- Not verified: WorkAdventure's map editor in a browser; a real SMTP provider (TLS, authentication,
  deliverability); a real map-storage outage; load beyond 20 clients on one machine.
- Partial or planned: named component collections (schema only); bulk operations and component updates have
  service tests but no end-to-end test; room templates are tested live and with fakes, not in CI.
- Known limits: component files are public by design (no personal data); organization uploads are
  validated automatically, not reviewed; no row-level security; audit log not tamper-evident.

## 14. Prioritized next steps

1. Decide the licenses (AdminSpace, pack); then distribute.
2. Run the map editor check in a browser against the `wa-test` stack (install, open the editor, place a
   desk, reload) and add it to `integration/live-test`.
3. Staging deployment with a real SMTP provider: invitation, registration and reset emails end to end.
4. External security assessment focused on tenant isolation, support access and uploads.
5. Named component collections (service and page on the existing tables).
6. End-to-end tests for bulk team operations and component updates; a real map-storage outage scenario.
7. Load test with realistic data volumes (thousands of members and installations).
