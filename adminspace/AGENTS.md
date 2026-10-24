# AGENTS.md - Adminspace

Self-hosted back office and WorkAdventure Admin API implementation (SvelteKit 2, Svelte 5 runes,
TypeScript strict, PostgreSQL with Drizzle, zod 3, Tailwind 4, Vitest).

Read `docs/ARCHITECTURE.md` and `docs/ADMIN_API.md` before changing behaviour.

## Commands

```sh
docker compose up -d db          # PostgreSQL on localhost:5433
npm run dev                      # http://localhost:4000 (.env loaded by vite.config.ts)
npm run typecheck && npm run svelte-check
npm run lint && npm run pretty-check
npx vitest run                   # contract tests need the database (migrated + seeded)
npm run db:generate              # after editing src/lib/server/db/schema.ts, then npm run db:migrate
npm run contract:sync            # after a WorkAdventure upgrade; then run the tests
npm run i18n:check
```

Prefer checks over mutating commands when validating. Never edit `src/lib/contract/workadventure/`
(generated) or migrations already applied somewhere: generate a new migration instead.

## Conventions

- **Admin API** (`src/lib/server/adminApi/`): answers must parse with the contract schemas
  (`src/lib/contract/`). Errors meant for players are `ErrorApiData` built with
  `src/lib/server/workadventure/errors.ts`, localized with the request's `Accept-Language`. Never change
  status codes WorkAdventure relies on (204 for saves, 200 + error body for refused bans). Add a contract
  test for every new endpoint.
- **Access control:** every `load` and every form **action** of the back office calls
  `loadOrganization()`/`loadWorld()` (`src/lib/server/context.ts`) with the needed permission from
  `PERMISSIONS` (`src/lib/server/auth/rbac.ts`). Layout loads do not protect actions.
- **Audit:** every mutation calls `audit()` with action (`area.verb`, e.g. `member.update`), target and
  IP. Never put secrets in `details`.
- **i18n:** no user-visible English in components or in server answers to pages. Actions return error
  codes (`keyof messages.common.errors`) or message keys; pages translate. Messages live in
  `src/lib/i18n/locales/en/<area>.ts` (one module per area); use `{placeholders}` and plural objects
  (`zero`/`one`/`two`/`few`/`many`/`other`) instead of string concatenation. Dates go through
  `DateTime.svelte` or `useI18n().dateTime()`, which shows ISO 8601 data in the account's time zone.
- **Layout and RTL:** use logical CSS (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, `border-e`), never
  left/right, so Arabic mirrors correctly.
- **Accessibility:** use `Field.svelte` for inputs, `FormMessage.svelte` for action feedback,
  `ConfirmForm.svelte` for destructive actions; keep visible focus and labels.
- **Data:** timestamps are `timestamptz` UTC, ids are UUIDs, countries are ISO 3166-1 alpha-2, locales
  are BCP 47. Settings blobs are validated by `src/lib/settings/*` and read with `read*Settings()`.

## Adding a locale

1. Add the tag, endonym and direction to `LOCALES` in `src/lib/i18n/index.ts`.
2. Create `src/lib/i18n/locales/<lang>/index.ts` exporting a `Messages` object, with one module per area
   like `en/`, and register it in `DICTIONARIES`.
3. `npm run typecheck` flags every missing key; `npm run i18n:check` lists values left in English.
4. Add the language to the documentation (`README.md`, `.env.example` `DEFAULT_LOCALE` comment).
