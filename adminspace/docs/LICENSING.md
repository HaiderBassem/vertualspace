# Licensing and provenance

This is an inventory, not legal advice. **AdminSpace has no license yet**: `package.json` is `private` and no
`LICENSE` file is present. Choosing one is the owner's decision, after the review requested at the end.

## Components and provenance

| Component                                                                            | Origin                                                                                                                                                                                                                                   | License (as declared)                                                                                                                                                                                                                                                                                                                                      | How it is used                                                                  | Obligations / notes                                                                    |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| AdminSpace source (`src/`, `scripts/`, `tests/`, `docs/`, `deploy/`, `integration/`) | Written for this project                                                                                                                                                                                                                 | Not yet chosen                                                                                                                                                                                                                                                                                                                                             | —                                                                               | Original work; does not copy admin.workadventu.re (closed source)                      |
| `src/lib/contract/workadventure/*.ts`                                                | Copied verbatim by `scripts/sync-contract.ts` from WorkAdventure `libs/messages/src/JsonMessages` at commit `b57916667f0f`                                                                                                               | **Unclear**: `libs/messages/package.json` declares `"ISC"` and that folder has no license file; other WorkAdventure components (`play/`, `back/`, `messages/`, `uploader/`, `desktop/`) carry `LICENSE.txt` stating AGPL-3.0 with the Commons Clause; WorkAdventure's website describes the self-hosted product as AGPL-3.0 modified by the Commons Clause | Imported at build and run time to validate Admin API payloads                   | Header in each file names its origin; resolve the question below before redistributing |
| `src/lib/contract/adminApi.ts`                                                       | Re-expressed (not copied) from schemas in WorkAdventure `play/src/pusher/services/*.ts`, `back/src/Services/Repository/LivekitCredentialsResponse.ts` and `play/src/room-api/...` (AGPL-3.0 + Commons Clause components)                 | Same question: interface descriptions written to interoperate                                                                                                                                                                                                                                                                                              | Admin API response types                                                        | Interoperability purpose documented in the file header                                 |
| Avatar catalog data                                                                  | Imported at run time from WorkAdventure's `play/src/pusher/data/woka.json` and `companions.json` (from a checkout or from the play image) into the deployment's database; texture images stay on WorkAdventure's servers (relative URLs) | WorkAdventure's (see above); the images are WorkAdventure assets                                                                                                                                                                                                                                                                                           | Served back to WorkAdventure through `/api/woka/list` and `/api/companion/list` | Not stored in this repository                                                          |
| WorkAdventure test maps (`maps/` of a checkout)                                      | Mounted read-only by `integration/live-test`                                                                                                                                                                                             | WorkAdventure's                                                                                                                                                                                                                                                                                                                                            | Test fixtures only                                                              | Not stored in this repository                                                          |
| Fonts and icons                                                                      | None bundled: system font stack; `static/favicon.svg` drawn for this project                                                                                                                                                             | —                                                                                                                                                                                                                                                                                                                                                          | —                                                                               | —                                                                                      |

## npm dependencies shipped in the server (production, `npm ls --omit=dev`, 2026-10-22)

| Package                             | Version | License    |
| ----------------------------------- | ------- | ---------- |
| @anatine/zod-openapi                | 2.2.8   | MIT        |
| @noble/hashes                       | 2.4.0   | MIT        |
| @node-rs/argon2 (+ platform binary) | 2.2.2   | MIT        |
| drizzle-orm                         | 0.45.4  | Apache-2.0 |
| jose                                | 6.2.13  | MIT        |
| openapi3-ts                         | 4.6.2   | MIT        |
| otpauth                             | 9.5.2   | MIT        |
| postgres                            | 3.4.9   | Unlicense  |
| ts-deepmerge                        | 6.2.1   | ISC        |
| ws                                  | 8.22.0  | MIT        |
| yaml                                | 2.9.1   | ISC        |
| zod                                 | 3.25.76 | MIT        |

Compiled into the server and browser bundles from development dependencies: Svelte, SvelteKit runtime,
adapter-node, Tailwind CSS output (all MIT). Apache-2.0 requires keeping its NOTICE and license text when
redistributing; MIT and ISC require keeping copyright notices. They are present in the image's `node_modules`;
generate a third-party notices file for bundled client code before distributing builds (for example
`npx license-checker --production`).

Development and build only (not shipped): 260 packages in total, all permissive (MIT, ISC, Apache-2.0,
BSD-2/3-Clause, 0BSD, Python-2.0, Unlicense) except `lightningcss` (MPL-2.0, file-level copyleft, used by
Tailwind at build time; its output is not covered).

## Container images

| Image                                             | Use                                | Licenses involved                                                                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:22-alpine`                                  | AdminSpace runtime image base      | Node.js (MIT and bundled third-party licenses); Alpine packages including BusyBox (GPL-2.0) and musl (MIT). Redistributing the built image carries the source-offer obligations of its GPL packages |
| `postgres:17-alpine`                              | Database                           | PostgreSQL License (permissive) and Alpine packages                                                                                                                                                 |
| Reverse proxy of `deploy/`                        | TLS                                | See `docs/DEPLOYMENT.md`                                                                                                                                                                            |
| `traefik`, `nginx`, `redis`, WorkAdventure images | `integration/` and live tests only | Not redistributed by this project                                                                                                                                                                   |

## Network use

If WorkAdventure-derived code in this project is AGPL-3.0, AGPL section 13 requires offering the
corresponding source to users interacting with the software over a network. AdminSpace's users are
administrators (back office) and WorkAdventure services (Admin API). The Commons Clause additionally restricts
selling a product whose value derives substantially from the software.

## Question for legal review

> AdminSpace is an independently written administration server (no code from WorkAdventure's closed-source
> SaaS admin). It contains 20 TypeScript files copied verbatim from WorkAdventure's `libs/messages/src/JsonMessages`
> (zod schemas describing the Admin API payloads), whose package declares the ISC license but which sits in a
> repository whose main components are licensed AGPL-3.0 with the Commons Clause; it also contains interface
> types re-expressed from AGPL-3.0 + Commons Clause files for interoperability, and imports WorkAdventure's
> avatar catalog data at run time. (1) Which license governs the copied `libs/messages` files? (2) Does
> including them, or the re-expressed interface types, make AdminSpace a work that must be distributed under
> AGPL-3.0 (with the Commons Clause), and does the Commons Clause restrict offering AdminSpace as a paid
> service? (3) If yes, would replacing the copied files by independently written schemas validated against
> WorkAdventure only in tests (not shipped) change that conclusion? (4) What notices must accompany
> distribution of the Docker image?

Until answered: do not distribute AdminSpace or offer it as a paid service. Internal self-hosted use alongside
your own WorkAdventure is the context it was built for.
