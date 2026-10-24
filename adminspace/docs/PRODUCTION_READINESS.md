# Production readiness report — 2026-10-23 (updated after the enterprise work)

**Recommendation: READY FOR STAGING ONLY.** (Enterprise work: [ENTERPRISE_REPORT.md](ENTERPRISE_REPORT.md).) The application, its WorkAdventure integration and its deployment
artifacts are verified; production approval still needs the owner decisions and external checks listed under
"Blocking production".

## Verification evidence (final run, after the enterprise work)

| Check                         | Command                                                   | Result                                                                                  |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Formatting                    | `npm run pretty-check`                                    | clean                                                                                   |
| Lint                          | `npm run lint`                                            | 0 problems                                                                              |
| Svelte / types                | `npm run svelte-check`, `npm run typecheck`               | 0 errors, 0 warnings (1286 files)                                                       |
| Translations                  | `npm run i18n:check`                                      | exit 0 (5 locales, no structural issue; identical-to-English warnings only)             |
| Contract drift                | `npm run contract:check`                                  | in sync with WorkAdventure `b57916667f0f`                                               |
| Schema drift                  | `npx drizzle-kit generate`                                | no changes                                                                              |
| Unit, contract, DB lifecycle  | `REQUIRE_DB_LIFECYCLE_TESTS=true npx vitest run`          | 20 files, 229 passed                                                                    |
| End to end (production build) | `npm run test:e2e`                                        | 472 passed, 0 failed, 0 skipped (10 enterprise journeys + upload included)              |
| Live map-storage (components) | `integration/live-test/components-scenario.ts`            | 8/8 checks against `workadventure-map-storage:master`                                   |
| Production image              | `docker build`, then `migrate.js` and `catalog-import.js` | runs as uid 1000; fresh database migrated; 32 components published, re-run 32 unchanged |
| Proxy and compose             | `caddy validate`, `docker compose ... config -q`          | valid                                                                                   |
| Dependency audit (shipped)    | `npm audit --omit=dev --audit-level=high`                 | 0 high/critical (2 moderate, see SECURITY.md)                                           |

## Feature matrix

| Feature                                                                                   | Status                  | Evidence                                                                 |
| ----------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| Organizations, team roles, last-owner protection                                          | PASS                    | e2e authz/workflows, `s2.db.test.ts` (concurrent demotion)               |
| Organization invitations (email, single use, expiry, revocation, resend, workspaces)      | PASS                    | `enterprise.db.test.ts`, `enterprise.services.db.test.ts`, e2e journey 2 |
| Registration with email verification, password reset by email                             | PASS                    | `enterprise.db.test.ts` (race, slug taken), services test, e2e journey 1 |
| Workspaces, workspace managers, moving worlds                                             | PASS                    | services test, e2e journeys 3 and 6                                      |
| Team: bulk operations with per-person report, suspension, removal, leave, transfer        | PASS                    | services test, `s2.db.test.ts`, e2e journey 9                            |
| Employee home and directory; employees refused administration                             | PASS                    | e2e journey 4                                                            |
| Tenant isolation, platform administrators without rights, support access                  | PASS                    | `enterprise.db.test.ts`, e2e journey 5, tenant and authz suites          |
| Component catalog: search, categories, favorites, previews, organization uploads          | PASS                    | services test, e2e journey 7 and upload journey                          |
| Components in WorkAdventure rooms (collection link, templates, update, removal guard)     | PASS (live map-storage) | `components-scenario.ts`, `enterprise.db.test.ts`, e2e journeys 7–8      |
| WorkAdventure map editor showing the furniture in a browser                               | NOT TESTED              | format checked with WorkAdventure's schema; no browser test              |
| Background jobs: outage surfaced, retried, repaired without duplicates                    | PASS                    | `enterprise.db.test.ts`, e2e journey 8 (fake map-storage)                |
| Control Center: figures, jobs, email deliveries, organizations, components                | PASS                    | e2e authz/i18n/a11y on `/admin`, journey 5                               |
| Real SMTP provider                                                                        | NOT TESTED              | local SMTP sink only                                                     |
| Worlds: create, settings, archive, delete, capacity                                       | PASS                    | e2e workflows; capacity fix in `s2.pure.test.ts`                         |
| World settings effective in WorkAdventure, persistent across restarts                     | PASS (live)             | `settings-scenario.mjs`                                                  |
| Rooms, default room, Tiled and map-storage maps, map checks                               | PASS                    | contract tests, e2e, `s2.pure.test.ts`                                   |
| Members, tags, CSV import/export, GDPR export/erasure                                     | PASS                    | `csv.test.ts`, `s2.db.test.ts`, e2e workflows                            |
| Ban/unban (person, IP), reports                                                           | PASS                    | contract tests, e2e                                                      |
| Live disconnection on ban, refusal at next entry, unban                                   | PASS (live)             | `scenarios.mjs`, `ban-reentry.mjs`                                       |
| Online status                                                                             | PASS (live)             | pusher `/rooms` against the live page                                    |
| Broadcast delivery                                                                        | PASS (live)             | message text in the player's websocket frames                            |
| Broadcast display                                                                         | BLOCKED (WorkAdventure) | pusher sends `type: ""`; front displays `type: "message"` only           |
| Room reload                                                                               | PASS (live)             | player shown "New version of map detected"                               |
| Upstream outage and recovery                                                              | PASS (live)             | `outage-scenario.mjs`; fake-pusher tests for malformed/500/timeout       |
| Wrong `ADMIN_API_TOKEN`                                                                   | PASS (live)             | 403, player refused (fails closed)                                       |
| Room API keys, custom domains (DNS TXT proof)                                             | PASS                    | `apiKeys.test.ts`, `s2.db.test.ts`, e2e                                  |
| Superadmin: status, accounts, 2FA reset, catalog, instance settings, audit                | PASS                    | e2e authz/i18n, `authSecurity.test.ts`                                   |
| Authentication: argon2id, lockout, TOTP single use, recovery codes, sessions              | PASS                    | `authSecurity.test.ts`, e2e auth                                         |
| Authorization and tenant isolation at the HTTP boundary                                   | PASS                    | e2e authz (184 tests) and tenant suites                                  |
| Rate limiting (shared store)                                                              | PASS                    | `authSecurity.test.ts`, e2e admin-api/auth                               |
| 5 locales, Arabic RTL, plurals, French typography                                         | PASS                    | e2e i18n (86 tests), `i18n*.test.ts`                                     |
| Accessibility (automated WCAG 2.2 A/AA)                                                   | PASS                    | axe: 0 violations on 31 pages (en-US, ar-SA); reflow at 375 px           |
| Retention (guests, analytics, sessions, audit, inactive bans, closed reports, recordings) | PASS                    | `retention.test.ts`                                                      |
| Migrations, backup/restore, DB outage                                                     | PASS                    | `tests/db`                                                               |
| Production deployment with real ACME certificates                                         | NOT TESTED              | no public DNS available                                                  |
| CI on GitHub                                                                              | NOT TESTED              | no remote configured; steps run locally                                  |

## Defects found and fixed during this work

Security: TOTP brute force and replay, stored XSS through URL fields, self-asserted domain verification, open
redirect (tab character), clickjacking (CSP), lockout race and enumeration, moderators granting `admin`,
placeholder secrets, LiveKit credential mixing, bulk export open to viewers, log leakage of query parameters.
Integration (live): stale authorization through WorkAdventure's pusher cache (now `Cache-Control: no-store`), empty
avatar catalog blocking players (import from the play image), misleading broadcast wording, malformed pusher answers
crashing pages. End to end: unchecked room move, 429 and 413 handling, untranslated status diagnostics, French colons,
reflow at 375 px, missing `<h1>`. Each has a regression test.

Enterprise work: Drizzle-wrapped constraint errors were not recognised (duplicate workspace slugs raised instead
of answering "slug taken"), grid blowout and table labels escaping their scroller at 375 px in Arabic, raw English
job errors and audit codes shown on translated pages, a job-claim query passing a `Date` as a text parameter, a
superadmin seeing every organization's worlds. Each has a regression test.

## Blocking production

1. **Licensing decision** (`docs/LICENSING.md`): the vendored WorkAdventure contract files have an unclear license
   (package says ISC, surrounding repository AGPL-3.0 with the Commons Clause); AdminSpace has no license. Requires
   legal review before distribution or a paid offering.
2. **External security assessment**: none performed.
3. **Real deployment check**: TLS with ACME on the target domain, private network to WorkAdventure, backup schedule
   and a restore drill on the target infrastructure.

## Release checklist

- [ ] Legal answer on licensing; add `LICENSE` and third-party notices.
- [ ] Generate secrets (`openssl rand -hex 32`); set `ADMIN_API_TOKEN` identically in WorkAdventure.
- [ ] Deploy `deploy/` on staging; confirm `/api/*` is not reachable publicly and WorkAdventure reaches it privately.
- [ ] Apply `deploy/workadventure.override.yaml` (private `ADMIN_URL`, `ADMIN_SOCKETS_TOKEN`, uploader).
- [ ] Create the first superadmin with `node build/cli/create-superadmin.js`; enable 2FA (`REQUIRE_MFA=true`).
- [ ] Import the avatar catalog from WorkAdventure's play image.
- [ ] Publish the built-in component pack (`node build/cli/catalog-import.js`); configure map-storage and its token.
- [ ] Configure `SMTP_URL`/`MAIL_FROM` (or accept link sharing without email); send a test invitation.
- [ ] Keep `JOB_WORKER=true` on at least one instance; watch Control Center for failed jobs and emails.
- [ ] Decide whether public registration opens (Control Center › Instance settings; closed by default).
- [ ] Run the `integration/live-test` scenarios (or their equivalent) against staging.
- [ ] Schedule `scripts/backup.sh`; run a restore drill.
- [ ] Review retention periods in Platform › Instance settings.
- [ ] Tag the release (recommended `0.2.0`, pre-1.0 until the blockers are cleared).
