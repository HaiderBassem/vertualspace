# Admin API

The endpoints WorkAdventure's **play** (pusher) and **back** services call when `ADMIN_API_URL` points at
Adminspace. They are declared in `src/lib/server/adminApi/routes.ts` and handled in
`src/lib/server/adminApi/handlers/`.

Response schemas are WorkAdventure's own: `src/lib/contract/workadventure/` is vendored from
WorkAdventure's `libs/messages` (`npm run contract:sync`), and `src/lib/contract/adminApi.ts` mirrors the
few shapes WorkAdventure defines in its play and back services. `tests/adminApi.contract.test.ts` parses
the answers with these schemas.

## Conventions

- **Authentication.** WorkAdventure sends `ADMIN_API_TOKEN` raw in the `Authorization` header (a
  `Bearer ` prefix is also accepted). A wrong token gets `403 Forbidden`, as WorkAdventure's documentation
  asks. Endpoints marked _none_ are called without the token by WorkAdventure.
- **Language.** Error screens are localized with the `Accept-Language` header WorkAdventure forwards
  from the player's browser (RFC 4647 lookup, see [STANDARDS.md](STANDARDS.md)).
- **Errors shown to players** are `ErrorApiData` bodies answered with `200`: `type: "error"` (error
  screen), `"unauthorized"` (error screen with a log-out button), `"retry"` (waiting screen) or
  `"redirect"`. Codes are SCREAMING_SNAKE_CASE: `ROOM_NOT_FOUND`, `WORLD_NOT_FOUND`, `WORLD_ARCHIVED`,
  `WORLD_EXPIRED`, `UNSUPPORTED_URL_FORMAT`, `USER_BANNED`, `USER_ACCESS_FORBIDDEN`,
  `ROOM_ACCESS_FORBIDDEN`, `WORLD_FULL`, `BAN_NOT_ALLOWED`.
- **Technical errors**: `400` with `{ "status": "error", "message": "Invalid body" }` for a malformed
  body, `404` for an unknown path, `405` with an `Allow` header for a wrong method, `500` for an
  unexpected failure (logged with an ISO 8601 timestamp).
- **Identifiers.** `userIdentifier`, `uuid`, `userUuid` are WorkAdventure's: the email of people logged in
  through OpenID Connect, a random UUID for anonymous people. Members are matched on uuid or email.
- **Arrays in query strings** are accepted as `name=a&name=b`, `name[]=a&name[]=b` (axios' default) or
  `name=a,b`.

## Endpoints

### Rooms and access

| Method | Path                  | Auth  | Parameters                                                                                                                                    | Answer                                                  |
| ------ | --------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/map`            | token | `playUri`, `userId?`, `accessToken?`                                                                                                          | `MapDetailsData` \| `RoomRedirect` \| `ErrorApiData`    |
| GET    | `/api/room/access`    | token | `playUri`, `userIdentifier`, `ipAddress`, `characterTextureIds[]`, `companionTextureId?`, `accessToken?`, `isLogged?` (deprecated), `chatID?` | `FetchMemberDataByUuidResponse`                         |
| GET    | `/api/room/sameWorld` | token | `roomUrl`, `bypassTagFilter`, `tags?` (comma-separated)                                                                                       | `ShortMapDescription[]`, or `404` + `ErrorApiErrorData` |
| GET    | `/api/room/tags`      | token | `roomUrl`                                                                                                                                     | `string[]`: every tag of the world                      |

`/api/map`:

- `/@/org/world/room`: the room's map (`wamUrl` for map-storage maps, `mapUrl` for Tiled maps) and the
  world's settings. Feature flags are only sent when the world sets them, because WorkAdventure treats an
  absent flag as enabled; `canReport` is always sent because WorkAdventure treats it as disabled when absent.
  `thirdParty` (Jitsi/BigBlueButton secrets) is sent for the back; the pusher strips it before answering
  browsers.
- `/@/org/world`: `RoomRedirect` to the default room.
- `/`: `RoomRedirect` to the start room of the instance settings.
- `/~/…` (map-storage) and `/_/…` (global maps): answered as WorkAdventure does without an admin.

`/api/room/access` checks, in this order, and answers the first refusal:

1. the room exists; 2. the world is neither archived nor expired; 3. no active ban matches the person's
   uuid, email or IP address (`USER_BANNED`); 4. the world's access policy (`authenticated` redirects to
   `/login`, `members` refuses non-members with `USER_ACCESS_FORBIDDEN`); 5. the room's required tags
   (`ROOM_ACCESS_FORBIDDEN`; the `admin` tag always passes); 6. the world's capacity, from the pusher's live
   counts (`WORLD_FULL` retry screen; fails open if the pusher cannot be reached; `admin` always passes).

On success it records the visit (a _guest_ member is created for people not added to the world) and
returns tags, validated textures, `canEdit` (map editor policy), `canRecord` (recording policy),
`applications`, `activatedInviteUser`, `analyticsEventsEnabled` and `world` (the world URL every room URL
starts with).

### Avatars

| Method | Path                          | Auth  | Body / parameters                                 | Answer                         |
| ------ | ----------------------------- | ----- | ------------------------------------------------- | ------------------------------ |
| GET    | `/api/woka/list`              | token | `roomUrl`, `uuid`                                 | `WokaList`                     |
| GET    | `/api/companion/list`         | token | `roomUrl`, `uuid`                                 | `CompanionTextureCollection[]` |
| POST   | `/api/save-name`              | token | `{ playUri, userIdentifier, name }`               | `204`                          |
| POST   | `/api/save-textures`          | token | `{ playUri, userIdentifier, textures: string[] }` | `204`                          |
| POST   | `/api/save-companion-texture` | token | `{ playUri, userIdentifier, texture \| null }`    | `204`                          |

WorkAdventure requires exactly `204` from the save endpoints. Saves for rooms outside of any world, or for
people not recorded yet, are accepted and ignored.

### People, chat and moderation

| Method | Path                         | Auth  | Body / parameters                                                              | Answer                                                         |
| ------ | ---------------------------- | ----- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| GET    | `/api/members`               | token | `playUri`, `searchText`                                                        | `MemberData[]` (20 most recently seen matches)                 |
| GET    | `/api/members/{uuid}`        | token | —                                                                              | `MemberData`, or `404`                                         |
| PUT    | `/api/members/{uuid}/chatId` | token | `{ chatId, userIdentifier?, roomUrl }`                                         | `{ status: "ok" }`                                             |
| GET    | `/api/world/tags`            | token | `playUri`, `searchText`                                                        | `string[]`                                                     |
| GET    | `/api/chat/members`          | token | `playUri` (or `roomUrl`), `searchText?`                                        | `WorldChatMembersData`                                         |
| POST   | `/api/report`                | token | `{ reportedUserUuid, reportedUserComment, reporterUserUuid, reportWorldSlug }` | `{ status: "ok", id }`; the report appears in _Moderation_     |
| POST   | `/api/ban`                   | token | `{ uuidToBan, playUri, name, message, byUserUuid, ipAddress? }`                | `{ status: "ok", id }`, or `200` + `ErrorApiData` when refused |

`/api/ban` is refused (`200` + error body, as the contract specifies) when the world or the banning
person is unknown (`ErrorApiErrorData`), or when the banning person does not hold the `admin` tag in the
world (`ErrorApiUnauthorizedData`, `BAN_NOT_ALLOWED`). The pusher then only kicks the person. Accepted bans
cover the uuid and, when given, the IP address, and are written to the audit log.

`/api/members/{uuid}` and `/api/members/{uuid}/chatId` are sent to `ADMIN_URL` rather than
`ADMIN_API_URL` by WorkAdventure.

### Media, domains and events

| Method | Path                          | Auth               | Body / parameters           | Answer                                                                                       |
| ------ | ----------------------------- | ------------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/api/capabilities`           | none               | —                           | `Capabilities`                                                                               |
| GET    | `/api/ice-servers`            | token              | `roomUrl`, `userIdentifier` | `IceServer[]` from the instance settings                                                     |
| GET    | `/api/livekit/credentials`    | token              | `playUri`                   | `{ livekitHost, livekitApiKey, livekitApiSecret }` (world settings, else instance), or `404` |
| GET    | `/api/domain/verify`          | token              | `uri`                       | `204` for the play domain or a verified organization domain, else `403`                      |
| GET    | `/white-label/cf-challenge`   | none               | `host`                      | the domain's challenge token (JSON string), or `404`                                         |
| GET    | `/api/room-api/authorization` | none (`X-API-Key`) | `roomUrl`                   | `{ success: true }` or `{ success: false, error, message }`                                  |
| POST   | `/api/recordings/events`      | token              | `RecordingEventPayload`     | `{ status: "ok" }`; idempotent on `egressId`; `400` (final) when malformed                   |
| POST   | `/api/analytics/events-batch` | token              | `AnalyticsEventsBatch`      | `{ status: "ok", accepted, dropped }`; `422` when the batch does not match the schema        |
| GET    | `/oauth/logout`               | none               | `token`                     | `204`                                                                                        |
| POST   | `/api/oauth/refreshtoken`     | token              | —                           | `501`: WorkAdventure's OpenID provider refreshes tokens                                      |

Room API keys are created per organization (optionally restricted to one world) in the back office.
Only a SHA-256 hash is stored. The key must belong to the organization of the room
(`PERMISSION_DENIED` otherwise); revoked and expired keys answer `UNAUTHENTICATED`.

Analytics events are stored only for worlds whose privacy settings enable analytics. The user uuid is
replaced by a keyed hash (HMAC-SHA-256 with `APP_SECRET`) and the IP address is never stored. The client
timestamp is clamped to the pusher's reception time.

## Capabilities

`GET /api/capabilities` always advertises `api/woka/list`, `api/companion/list`, `api/save-name`,
`api/save-textures`, `api/domain/verify`, `api/ban`, `api/recordings/events`, `api/analytics/events-batch` and
`api/presence/report` (all `v1`). It adds:

- `api/ice-servers` once ICE servers are set in the instance settings. Without it WorkAdventure uses its
  own `STUN_SERVER`/`TURN_SERVER` variables.
- `api/livekit/credentials` once an instance-level LiveKit server is set.
- `api/calendar/events` once people can connect a calendar on this server (Google or Microsoft configured, see
  [INTEGRATIONS.md](INTEGRATIONS.md)).
- `api/presence/activity` once people can connect Spotify, GitHub or GitLab.

WorkAdventure reads capabilities **once, when play and back start**. Restart them after changing ICE or
LiveKit settings, or after configuring an integration provider.

## Integration Center: calendars and presence

What people chose to share with the office from their own accounts (My integrations). The answers follow
WorkAdventure's own schemas, `isCalendarEventsData` and `isPresenceActivityData` (`libs/messages`, vendored in
`src/lib/contract/workadventure/CalendarEventsData.ts`; `tests/integrations.db.test.ts` parses every answer with them).
Both endpoints need the admin token, answer `200` with the documented body (also when the person has nothing connected), `400` +
`{ "status": "error", "message": "Invalid parameters" }` for missing or malformed parameters, and never include a token.
The person is resolved from `userIdentifier` (the email of a signed-in person, or the uuid of a member of the world
whose email is known) to an **active** account with an **active** membership of the organization of `playUri`:
anonymous people, suspended members and other organizations get `connected: false` / `null`.

### `GET /api/calendar/events`

| Parameter        | Required | Meaning                                                                           |
| ---------------- | -------- | --------------------------------------------------------------------------------- |
| `userIdentifier` | yes      | WorkAdventure userUuid or email (≤ 320 characters)                                |
| `playUri`        | yes      | URL of the room (its organization is the scope)                                   |
| `from`, `to`     | no       | ISO 8601; default now and now + 24 h; `to` must be after `from`; capped at 7 days |

```json
{
    "connected": true,
    "provider": "google",
    "events": [
        {
            "id": "busy-2026-10-24T09:00:00.000Z",
            "title": "Busy",
            "start": "2026-10-24T09:00:00.000Z",
            "end": "2026-10-24T09:30:00.000Z",
            "allDay": false,
            "busy": true,
            "location": null,
            "joinUrl": null
        }
    ],
    "fetchedAt": "2026-10-24T08:55:00.000Z",
    "error": null
}
```

- `provider`: `"google"`, `"microsoft"` or `null` (nothing connected). One calendar per person and organization.
- Times are UTC; all-day events have `allDay: true` and start at midnight UTC of their first day.
- `busy`: Google entries not marked "free"; Microsoft `showAs` `busy` or `oof`. Cancelled entries are left out.
- Free/busy only is the default: `title` is `"Busy"` (WorkAdventure translates it), `location` and `joinUrl` are
  `null`. Titles, places and `joinUrl` (http(s) only) appear only for people who chose "Titles, places and meeting links".
- Answers are cached 60 seconds per person and window. `fetchedAt` is when the provider was read.
- `error`: `null`, `"expired"` (`connected: false`: the person must reconnect), `"rate_limited"`,
  `"provider_unavailable"` or `"permission_missing"` (`connected: true`, with the last events read when there are any).

### `GET /api/presence/activity`

Parameters: `userIdentifier` (required), `playUri` (recommended: scopes the answer to the room's organization; without
it, an email identifier is looked up in every organization of the person).

```json
{
    "music": { "title": "Clair de lune", "artist": "Debussy" },
    "coding": { "provider": "github", "repo": "acme/api", "at": "2026-10-24T08:41:00.000Z" }
}
```

- `music`: what Spotify is playing, only when the person enabled "Show what I am listening to"; `null` while paused
  or when nothing plays (cached 30 seconds).
- `coding`: the latest push, pull or merge request of the last two hours, only when the person enabled "Show my coding
  activity", with its repository (GitLab activity counts once the organization webhook named the project: polling with
  `read_user` does not).
- Each source has a 4-second deadline: a slow provider gives `null`, never a slow answer.

## Who's in: `POST /api/presence/report`

Each WorkAdventure pusher reports the people connected to it, so that the back office can show who is in the
organization's worlds right now ([PRESENCE.md](PRESENCE.md)). Advertised as `"api/presence/report": "v1"` with no
configuration. Contract: `isPresenceReportData` of WorkAdventure (`libs/messages`, vendored in
`src/lib/contract/workadventure/PresenceReportData.ts`); `tests/presence.db.test.ts` sends reports through the router.

```json
{
    "instanceId": "pusher-7f3c2a",
    "reportedAt": "2026-10-24T09:00:00.000Z",
    "ttlSeconds": 90,
    "users": [
        {
            "userIdentifier": "jane.doe@example.com",
            "name": "Jane",
            "isLogged": true,
            "playUri": "https://play.example.com/@/acme/hq/floor-1",
            "availabilityStatus": "BUSY",
            "connectedAt": "2026-10-24T08:12:00.000Z"
        }
    ]
}
```

- The pusher sends the **full** list of its people a few seconds after any join, leave or status change, and at least
  every `ttlSeconds / 3`. A report **replaces** the previous report of the same `instanceId`; an older report (by
  `reportedAt`) never replaces a newer one, unless that one expired.
- A report holds `ttlSeconds` (clamped to 15–600 s) **from its reception** (the pusher's clock only orders its own
  reports). After that its people are no longer shown; stale rows are purged when the next report arrives and by the
  hourly retention.
- `playUri` is resolved with the resolver of `/api/map` (`resolvePlayUri`): a world URL without room means the world's
  entry room. People in `/~/` and `/_/` maps, or in unknown worlds and rooms, are not stored. Unknown
  `availabilityStatus` values are shown as online.
- Answers: `204` stored (or ignored as older); `400` + `{ "status": "error", "message": "Invalid presence report" }`
  for a body the contract refuses, an `instanceId` empty or over 200 characters, or a `reportedAt` that is not a date;
  `413` above 5,000 people or 2.5 MB (set `BODY_SIZE_LIMIT` to at least `3M` for pushers with thousands of people);
  `403` without the admin token.

## Endpoints Adminspace calls on WorkAdventure

| Call                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `GET {pusher}/rooms`         | live occupancy per room (cached 10 s)                                            |
| `POST {pusher}/message`      | message shown to everyone in the chosen rooms                                    |
| `POST {pusher}/room/refresh` | ask everyone in a room to reload it                                              |
| `POST {pusher}/global/event` | scripting API event to every room                                                |
| `WS {pusher}/ws/admin/rooms` | live list of connected people, and `banned` events (needs `ADMIN_SOCKETS_TOKEN`) |
| `GET {map-storage}/maps`     | list of maps when choosing a room's map                                          |

`{pusher}` is the _pusher internal URL_ of the instance settings, or the play URL.
