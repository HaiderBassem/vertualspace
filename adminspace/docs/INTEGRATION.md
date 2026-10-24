# Connecting WorkAdventure to Adminspace

WorkAdventure calls its admin, never the other way round (except for live features, see below). When
`ADMIN_API_URL` is set, WorkAdventure's **play** service (pusher) and **back** service ask this admin
which map a URL opens, who may enter, which tags people hold, which avatars exist, and they send it
reports, bans, recording events and analytics.

This guide uses the WorkAdventure checkout at `/Users/swibit/Projects/workadventure` and its
development stack (`docker-compose.yaml`, Traefik, `*.workadventure.localhost`).

## 0. Tested version and verified behaviour

- **Target:** WorkAdventure commit `b57916667f0fe37e95b84d8cb0c2f490486027da` (master on 2026-10-22). The
  Admin API contract in `src/lib/contract/workadventure` is synced from that commit (`npm run contract:check`)
  and the official images `thecodingmachine/workadventure-{play,back,map-storage}:master` used for the live
  test carry that revision (`org.opencontainers.image.revision`).
- **Live test:** `integration/live-test/README.md` describes the disposable stack, the commands and the results
  (entry, online status, broadcast, reload, ban with live disconnection, re-entry, unban, persistence across
  restarts, outage and recovery, wrong token). Re-run it when upgrading WorkAdventure.
- **Startup order:** play and back call `GET /api/capabilities` at startup and keep retrying (every 500 ms by
  default) until the admin answers; neither finishes starting before. Start (or keep) AdminSpace first.
- **Restart rules:** play and back read capabilities once. Restart them after enabling ICE servers or LiveKit
  in **Platform › Instance settings**, or after changing `ADMIN_API_URL`/`ADMIN_API_TOKEN`. Everything else
  (worlds, rooms, settings, tags, bans) is read per request and needs no restart.
- **Avatar catalog in production:** a fresh install has an empty catalog, and WorkAdventure then refuses every
  player ("Failed to load Woka customization data"). Import the catalog from WorkAdventure's own play image:

    ```sh
    docker compose cp play:/usr/src/play/src/pusher/data ./wa-catalog
    docker compose cp ./wa-catalog adminspace:/tmp/wa-catalog
    docker compose exec adminspace node build/cli/seed.js --from /tmp/wa-catalog
    ```

- **Behaviours of this WorkAdventure version that affect administration:**
    - The pusher caches GET answers of its Admin API client for 5 minutes (`setupCache(axios)` in
      `play/src/room-api/authentication/AdminAuthenticator.ts` applies to axios's global instance). AdminSpace
      answers every Admin API call with `Cache-Control: no-store` so that bans, tags and access changes apply
      at the next connection; do not strip that header in a proxy.
    - Admin broadcasts (`POST /message` on the pusher) reach the players' browsers but are not displayed: the
      pusher sends `type: ""` and the front only displays `type: "message"`.
    - `/api/room/access` carries no name: guests appear without a name in AdminSpace until a name is saved
      through `/api/save-name`.
    - play refuses to start without `UPLOADER_URL`. WorkAdventure's `contrib/docker/docker-compose.prod.yaml`
      does not forward `ADMIN_SOCKETS_TOKEN` to play: add it in an override, or live disconnection after a
      ban and the live list of connected people are unavailable.

## 1. Choose how the admin runs

| Setup                                    | Admin URL seen by WorkAdventure containers          | Use                                               |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| In WorkAdventure's compose (recommended) | `http://adminspace:3000`                            | [integration/README.md](../integration/README.md) |
| On your machine with `npm run dev`       | `http://host.docker.internal:4000` (macOS, Windows) | development of the admin itself                   |

## 2. Values shared by both sides

| Variable              | WorkAdventure (`play`, `back`)  | Adminspace `.env` |
| --------------------- | ------------------------------- | ----------------- |
| `ADMIN_API_TOKEN`     | same random value               | same random value |
| `ADMIN_SOCKETS_TOKEN` | same random value (`play` only) | same random value |

`ADMIN_API_TOKEN` authenticates every call WorkAdventure makes to the admin; the admin also uses it to
call the pusher's own admin endpoints (`/rooms`, `/message`, `/room/refresh`, `/global/event`).
`ADMIN_SOCKETS_TOKEN` signs the JWTs of the pusher's admin websocket (`/ws/admin/rooms`), used for the
live list of connected people and to disconnect a person immediately when they are banned from the back
office. Without it the admin works, minus these two live features.

## 3. WorkAdventure settings

| Variable                       | Value                                          | Read by    | Purpose                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_API_URL`                | `http://adminspace:3000`                       | play, back | Enables the Admin API. Unset means WorkAdventure uses its built-in local behaviour.                                                                                                   |
| `ADMIN_API_TOKEN`              | shared secret                                  | play, back | Sent raw in the `Authorization` header.                                                                                                                                               |
| `ADMIN_URL`                    | `http://admin.workadventure.localhost`         | play       | Public URL of the admin. Also used server-side for `/api/members/{id}/chatId`, `/api/ice-servers` and `/api/oauth/refreshtoken`, so it must be reachable from the play container too. |
| `ADMIN_SOCKETS_TOKEN`          | shared secret                                  | play       | Enables `/ws/admin/rooms`.                                                                                                                                                            |
| `OPID_PROFILE_SCREEN_PROVIDER` | `http://admin.workadventure.localhost/profile` | play       | Page shown in WorkAdventure's profile menu (defaults to `ADMIN_URL/profile`).                                                                                                         |
| `START_ROOM_URL`               | unchanged                                      | play       | Also copy it into the admin (`WORKADVENTURE_START_ROOM_URL`): with an admin, `/` is redirected by the admin.                                                                          |

WorkAdventure's `docker-compose.yaml` only forwards `ADMIN_API_URL` and `ADMIN_API_TOKEN` to `play` and
`back`. The other variables are therefore set by the override file
`integration/docker-compose.workadventure.yaml` rather than in `.env`.

**Restart `play` and `back` after changing the admin's capabilities.** WorkAdventure fetches
`GET /api/capabilities` once, at startup, and retries until the admin answers. The ICE servers and LiveKit
capabilities only appear once they are configured in **Platform › Instance settings**.

## 4. Adminspace settings

In the admin's `.env` (or the override file):

| Variable                               | Example                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `WORKADVENTURE_PLAY_URL`               | `http://play.workadventure.localhost`                     |
| `WORKADVENTURE_PUSHER_INTERNAL_URL`    | `http://play.workadventure.localhost`                     |
| `WORKADVENTURE_MAP_STORAGE_PUBLIC_URL` | `http://map-storage.workadventure.localhost`              |
| `WORKADVENTURE_START_ROOM_URL`         | `/_/global/maps.workadventure.localhost/starter/map.json` |

These are only initial values: superadmins change them later in **Platform › Instance settings**.

Seed the avatar catalog from the WorkAdventure checkout (`npm run db:seed`), so that texture identifiers
match the ones players already have.

## 5. How URLs map

| WorkAdventure URL                  | Answer of the admin                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/@/{organization}/{world}/{room}` | Room of a world managed here: map, settings, access rules, tags, bans                                                                                   |
| `/@/{organization}/{world}`        | Redirect to the default room of the world                                                                                                               |
| `/~/{path}.wam`                    | Map-storage map outside of any world: open to everyone, as without an admin. Map edition only for the people listed in _Map editors outside of worlds_. |
| `/_/{instance}/{host}/{path}`      | Tiled map hosted elsewhere: open to everyone, as without an admin                                                                                       |
| `/`                                | Redirect to the start room                                                                                                                              |

## 5b. Office components in WorkAdventure

How furniture installed in AdminSpace reaches the inline map editor (evidence from WorkAdventure's source in
`docs/ENTERPRISE_ARCHITECTURE.md`):

1. Each world has one **entity collection** file, `ORIGIN/wa/worlds/{worldId}/collection.json`
   (WorkAdventure's `entityCollection` format 1.0), listing the published variants of every component installed
   in the world. Prefab ids are `adminspace:{componentId}:{variant}`; images are absolute URLs under
   `ORIGIN/wa/assets/{versionId}/{sha256}.{ext}` (immutable, cross-origin readable).
2. WorkAdventure's editor loads only the collections listed in the room's **WAM file** (`entityCollections`).
   Installing a component therefore queues a job per map-storage room of the world that reads the WAM and adds
   the collection URL with a JSON Patch (`test` + `add`), never twice. The world setting "entity collection URLs"
   sent in map details has no effect on this WorkAdventure version.
3. **Room templates** are uploaded as a ZIP (Tiled map, tileset, WAM with the furniture already placed) to
   map-storage `POST /upload`, in a directory of their own (`adminspace/{organizationId}/{worldId}/{roomId}`);
   the room then opens with its furniture in place.

Requirements and limits:

- The room's map must be a WAM file on the map-storage configured in **Control Center › Instance settings**,
  with its API token (AdminSpace holds no credentials for other map-storages). Tiled maps (`.tmj`) have no
  inline editor; **World › Components** shows each room's compatibility.
- `ORIGIN` must be reachable by players' browsers; `/wa/**` needs no session.
- AdminSpace writes only maps the organization owns: its own `adminspace/{organizationId}/` directory, or maps
  outside AdminSpace's directories that no room of another organization uses (map-storage's token can write
  every map, so this rule is AdminSpace's). Rooms on another organization's map are refused and shown as such.
- Removing a component is refused while one of its pieces is placed in a room (AdminSpace reads the WAM files;
  if it cannot, it refuses rather than guess).

Verified: against WorkAdventure's real map-storage (`thecodingmachine/workadventure-map-storage:master`, the
`wa-test` stack) with `integration/live-test/components-scenario.ts`: the template upload is accepted by
map-storage's validator, the uploaded WAM lists the collection and 10 placed entities, a real JSON Patch is
accepted, and a removed reference is restored exactly once. **Not verified in a browser:** opening
WorkAdventure's map editor and seeing the furniture in its entity explorer.

## 5c. Room sizes and rooms created inside WorkAdventure

Map-storage is the source of truth for maps; AdminSpace never stores a room's size.

- **Current size** of a room: the `width`/`height` of its Tiled map, read by fetching the WAM file and the Tiled
  map its `mapUrl` points to (relative to the WAM URL). Both must be on the configured map-storage; a Tiled map
  hosted elsewhere is never fetched.
- **Resizing** calls map-storage `POST /resize` (bearer token, `X-Map-Storage-Host` = host of the public
  map-storage URL) with `{ wamUrl, width, height, anchor, fill, dryRun }`. Pages preview with `dryRun: true`
  (columns and rows added or removed, objects and zones moved), then resize. Map-storage moves the people in the
  room with the map. The same ownership rule as for components applies (`wamWritableBy`).
    - **Room page** (`/o/{org}/w/{world}/rooms/{room}`): "Room size" panel (presets by team size, custom size,
      "keep in place" grid, fill), live preview through `…/rooms/{room}/size?width&height&anchor&fill`.
    - **Many rooms** (`/o/{org}/room-sizes`, or `?workspace={slug}` for one workspace): rooms of the workspaces
      the person manages, an exact size or grow/shrink by N tiles, a dry-run table, then one `room.resize` job
      per room. 5xx and network errors are retried with backoff, 4xx are not; results per room on the same page.
    - **Rooms from templates** take a size: the provisioning job uploads the template, then resizes it
      (`fill: "extend"`, `anchor: "top"`, so the doorway stays bottom middle). If map-storage refuses the size,
      the room stays usable at the template's size and shows "resizeRejected".
    - **Create an office** (`/o/{org}/office/new`): Name, Layout (Open, Hybrid, Private), Size; a world of
      template rooms resized for the team, the reception or open office as default room, and doors: WAM exit
      areas (`{ id, name, x, y, width, height, visible: true, properties: [{ id, type: "exit", url: "/@/{org}/{world}/{room}", areaName: "" }] }`)
      added with a JSON Patch on `/areas`, one 2×1 door in each room's doorway leading to the default room, and
      one door per other room along the default room's walls (away from furniture, its entrance and its spawn).
- **Rooms created inside WorkAdventure** ("Add room" in the map editor) are written by map-storage next to the
  room they come from, e.g. `adminspace/{organizationId}/{worldId}/focus-room/map.wam`, and announced through
  map-storage's webhook. Configure map-storage with:

    | map-storage variable | Value                                                                                               |
    | -------------------- | --------------------------------------------------------------------------------------------------- |
    | `WEB_HOOK_URL`       | `http://adminspace:3000/hooks/map-storage` (private network; the production proxy refuses `/hooks`) |
    | `WEB_HOOK_API_TOKEN` | the **Map storage webhook token** of **Platform › Instance settings**                               |

    The token can also come from `WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN`. The webhook (`POST /hooks/map-storage`,
    `Authorization: <token>` or `Bearer <token>`, constant-time check, refused when no token is configured)
    registers a room when a map under `adminspace/{organizationId}/{worldId}/{dir}/map.wam` is updated, the world
    belongs to that organization and is open, and no room uses that map yet: map kind `wam`, name from the WAM
    `metadata.name` (else the directory name), a free slug from the directory name, audited as `room.create` by
    `system:map-storage`. It then appears in `/api/room/sameWorld` with its `wamUrl`, which WorkAdventure polls.
    Directories named like a room id (AdminSpace's own template rooms) are never registered. A `delete` marks the
    rooms using the map failed ("mapDeleted") and never deletes anything; a later `update` of the same map makes
    them ready again. Every other call answers `200 {"result":"ignored", …}`.

Verified against a local fake map-storage implementing this contract (`tests/roomSizes.db.test.ts`,
`tests/mapStorageWebhook.db.test.ts`). **Not verified yet** against WorkAdventure's real map-storage `/resize` and
webhook, nor in a browser (people moved with the map, the in-game "Add room" door).

## 6. Running the admin outside of Docker

```sh
cd /Users/swibit/Projects/adminspace
docker compose up -d db
cp .env.example .env            # set ADMIN_API_TOKEN like WorkAdventure's, APP_SECRET
npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev                     # http://localhost:4000
```

In WorkAdventure's `.env`: `ADMIN_API_URL=http://host.docker.internal:4000`. On Linux, add
`extra_hosts: ["host.docker.internal:host-gateway"]` to `play` and `back`, or use the host's IP address.
Set `WORKADVENTURE_PUSHER_INTERNAL_URL=http://play.workadventure.localhost` in the admin: from your
machine, Traefik routes it to the pusher.

## 7. Troubleshooting

| Symptom                                                                                       | Cause and fix                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Play logs `Could not reach Admin API server at …, will retry`                                 | The admin is not reachable from the play container: wrong `ADMIN_API_URL`, admin not started, or `localhost` used instead of `host.docker.internal`/a service name.                                                     |
| Every room shows an error, admin logs show 403s                                               | `ADMIN_API_TOKEN` differs between WorkAdventure and the admin (the JSON request log shows `"path":"/api/map","status":403`; players see `ROOM_ACCESS_ERROR … 403`). It is compared exactly (no `Bearer` prefix needed). |
| "Failed to load Woka customization data", or players always sent to the Woka selection screen | The avatar catalog is empty or the texture ids differ: import it from WorkAdventure's play image (section 0) or run `npm run db:seed` in development.                                                                   |
| A ban or tag change seems ignored for a few minutes                                           | A proxy between WorkAdventure and the admin removed `Cache-Control: no-store`, so the pusher reuses cached answers (section 0).                                                                                         |
| _Live_ page says WorkAdventure cannot be reached                                              | `WORKADVENTURE_PUSHER_INTERNAL_URL` (or the play URL) is wrong, or `ADMIN_API_TOKEN` differs.                                                                                                                           |
| No list of connected people                                                                   | `ADMIN_SOCKETS_TOKEN` missing or different on one side; restart play after setting it.                                                                                                                                  |
| ICE servers or LiveKit settings ignored                                                       | Restart play and back: capabilities are read at startup.                                                                                                                                                                |
| OpenID login loops back with a domain error                                                   | The login redirect domain is neither the play URL's domain nor a verified domain of an organization (`/api/domain/verify`).                                                                                             |
