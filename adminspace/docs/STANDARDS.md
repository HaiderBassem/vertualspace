# Standards

This page lists the international standards Adminspace follows and where each one is applied in the code.

It describes design alignment only. Adminspace has **not** been audited or certified against any of
these standards. Certification (for example ISO/IEC 27001) applies to an organization and its
processes, not to a piece of software. What Adminspace offers is features that support the controls an
operator has to implement.

## Data formats and identifiers

| Standard                                        | Applied in                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISO 8601 / RFC 3339** (date and time)         | Every timestamp is stored as PostgreSQL `timestamptz` in UTC (`src/lib/server/db/schema.ts`, session time zone forced to UTC in `db/client.ts`) and exchanged as ISO 8601: `expireOn` in `MapDetailsData`, recording and analytics payloads (`z.string().datetime()`), exports, `<time datetime>` in `DateTime.svelte`. |
| **ISO 3166-1 alpha-2** (countries)              | `organizations.country_code`; names displayed with `Intl.DisplayNames` and the list built in `src/lib/i18n/format.ts` (`countryOptions`).                                                                                                                                                                               |
| **ISO 639 + BCP 47 / RFC 5646** (language tags) | Locales `en-US`, `fr-FR`, `de-DE`, `es-ES`, `ar-SA` (`src/lib/i18n/index.ts`); `accounts.locale`, `organizations.default_locale`, `members.locale`; `<html lang>` and `lang` on each language name in the switcher.                                                                                                     |
| **RFC 4647** (language range matching)          | `negotiateLocale()` implements the _lookup_ scheme over `Accept-Language` (with quality values), for the back office and for the error screens WorkAdventure shows players.                                                                                                                                             |
| **IANA time zone database**                     | `accounts.time_zone`; dates are displayed in the account's zone with `Intl.DateTimeFormat`.                                                                                                                                                                                                                             |
| **Unicode / UTF-8**                             | UTF-8 everywhere (`<meta charset>`, JSON, CSV import/export); slugs are ASCII-folded with Unicode NFKD normalization (`slugify`); `Intl.Collator` sorts localized lists.                                                                                                                                                |
| **CLDR plural rules / ECMA-402**                | Plural messages declare CLDR categories (`zero`, `one`, `two`, `few`, `many`, `other`) selected with `Intl.PluralRules`, which Arabic requires; numbers, dates and relative times use `Intl` (`src/lib/i18n/format.ts`).                                                                                                |
| **RFC 9562** (UUID)                             | Primary keys are database-generated UUIDs (`gen_random_uuid()`, version 4).                                                                                                                                                                                                                                             |
| **RFC 4180** (CSV)                              | Member import and export.                                                                                                                                                                                                                                                                                               |

## HTTP and web

| Standard                                 | Applied in                                                                                                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RFC 9110** (HTTP semantics)            | Status codes in the Admin API router: `204` for saves, `403` for a wrong token, `404`, `405` with `Allow`, `422` for an analytics batch that does not match the schema, `303` redirects after form posts (`src/lib/server/adminApi/router.ts`). |
| **RFC 9457** (Problem Details)           | `problem()` in `src/lib/server/http/problem.ts` answers `application/problem+json` for back-office JSON endpoints. The WorkAdventure Admin API deliberately does not use it, because WorkAdventure expects its own `ErrorApiData` format.       |
| **RFC 6265bis** (cookies)                | Session cookie `HttpOnly`, `SameSite=Lax`, `Secure` and `__Host-` prefix in production (`src/lib/server/auth/session.ts`).                                                                                                                      |
| **RFC 6797** (HSTS) and security headers | `Strict-Transport-Security` in production, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` and a Content Security Policy (`hooks.server.ts`, `svelte.config.js`).                                          |
| **OpenAPI / JSON Schema**                | The contract is expressed as zod schemas from WorkAdventure, which are the source of WorkAdventure's own Swagger documentation.                                                                                                                 |

## Security

| Standard                                         | Applied in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OWASP Password Storage Cheat Sheet / ASVS V2** | argon2id with m = 19 MiB, t = 2, p = 1; constant-time verification for unknown emails; lockout for 15 minutes after 10 failures (`src/lib/server/auth/credentials.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **NIST SP 800-63B**                              | Passwords of 12 to 256 characters, without composition rules (§3.1.1.2 sets a minimum of 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **RFC 6238** (TOTP) / **RFC 4226**               | Two-factor authentication: SHA-1, 6 digits, 30 s, ±1 step; secrets encrypted at rest; can be made mandatory with `REQUIRE_MFA`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **ISO/IEC 27001:2022 Annex A**                   | Features supporting these controls:<br>• **5.15** Access control: per-organization roles (`rbac.ts`), `404` for invisible organizations.<br>• **8.2** Privileged access rights: superadmin flag, at least one active superadmin and one owner kept.<br>• **8.5** Secure authentication: argon2id, TOTP, lockout, sliding sessions, sessions ended on password change.<br>• **8.15** Logging: append-only `audit_logs` with actor, action, target, IP and UTC time, secrets redacted (`audit.ts`).<br>• **8.24** Use of cryptography: AES-256-GCM for TOTP secrets, SHA-256 for session tokens and API keys, HMAC-SHA-256 pseudonyms, constant-time token comparison.<br>• **8.28** Secure coding: strict TypeScript, validation of every input with zod, parameterized SQL (Drizzle), CSRF origin check, open-redirect guard. |
| **ISO/IEC 27701 / GDPR**                         | • Pseudonymization (GDPR art. 4(5)): analytics store an HMAC of the user id, never the IP address.<br>• Data minimization: IP addresses are kept only on bans, sessions and audit entries.<br>• Right of access (art. 15): JSON export of a member.<br>• Right to erasure (art. 17): member erasure.<br>• Storage limitation (art. 5(1)(e)): per-world retention settings.<br>• No third-party fonts or scripts are loaded.                                                                                                                                                                                                                                                                                                                                                                                                   |

## Accessibility

**WCAG 2.2 level AA** is the target. ISO/IEC 40500:2012 is the ISO publication of the older WCAG 2.0.
What is applied:

- Semantic landmarks and a skip link.
- Labels tied to inputs, plus `aria-describedby` and `aria-invalid` on errors (`Field.svelte`).
- Status messages in `aria-live` regions (`FormMessage.svelte`).
- `aria-current` in navigation, and native `<dialog>` elements for confirmations.
- Visible focus and targets of at least 24×24 px (2.5.8).
- Text contrast of 4.5:1 or more in light and dark themes.
- `prefers-reduced-motion` honoured.
- Right-to-left layout through CSS logical properties and `dir="rtl"`.

## Quality model

**ISO/IEC 25010** frames the non-functional requirements:

- **Functional suitability:** contract tests against WorkAdventure's schemas.
- **Compatibility:** `npm run contract:check` detects drift with WorkAdventure.
- **Security:** see above.
- **Maintainability:** typed layers, one dictionary module per area, lint and format checks in CI.
- **Portability:** a Docker image with health checks, and configuration through environment variables.
- **Usability:** internationalization and accessibility.

## Gaps and items not yet covered

- No external security audit, penetration test or accessibility audit has been carried out.
- The back office has no single sign-on (OpenID Connect or SAML) of its own: back-office accounts use
  passwords and TOTP. WorkAdventure players still log in through WorkAdventure's own OpenID provider.
- Retention covers guests, analytics events and sessions only (an hourly job, also
  `npm run retention:run`; analytics default to 395 days). Audit logs, bans and reports are kept
  until deleted by hand: decide their retention period for your own organization.
- Audit logs are append-only by design but are not tamper-evident (no hash chain or WORM storage).
- There is no rate limiting on the Admin API. It is meant to be reachable only by WorkAdventure, so keep
  it on a private network or behind the reverse proxy.
- Translations other than English are maintained by hand. `npm run i18n:check` reports values left
  identical to English.
