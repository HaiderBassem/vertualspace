# Who's in

`/o/{org}/presence` ("Who's in" in the navigation) shows the people connected to the organization's worlds **right
now**, as WorkAdventure reports them. It answers "who is in the office?" without opening WorkAdventure.

## What is shown

- People grouped by **world**, then by **room** (rooms in the world's order), sorted by name.
- For each person: the name they chose in WorkAdventure, **Signed in** or **Guest**, their **status** with a coloured
  dot, **since when** they are in the room, and a link to their **member page** in that world when they are known there
  (member or recorded guest). Signed-in people whose email matches an account of the organization's team also show that
  account's name and email.
- Counts: people online, how many signed in, how many guests; per world and per room.
- An empty state when nobody is connected (or WorkAdventure does not report to this server).
- The page refreshes itself every 15 seconds (it polls `/o/{org}/presence/now`, a JSON view checked with the same
  permission; it pauses while the browser tab is hidden).
- The members list of a world shows a green **Online now** dot next to people connected to that world, for viewers
  allowed to see presence (one query per page of the list).

Statuses (WorkAdventure's `availabilityStatus`):

| WorkAdventure                      | Shown as                         | Dot    |
| ---------------------------------- | -------------------------------- | ------ |
| `ONLINE` and any unknown value     | Online                           | green  |
| `AWAY`, `BACK_IN_A_MOMENT`         | Away, Back in a moment           | amber  |
| `BUSY`, `DO_NOT_DISTURB`           | Busy, Do not disturb             | red    |
| `JITSI`, `BBB`, `SPEAKER`          | In a meeting, Speaking           | accent |
| `SILENT`, `DENY_PROXIMITY_MEETING` | Silent, Not taking conversations | grey   |

## How it works

1. AdminSpace always advertises `"api/presence/report": "v1"` in `GET /api/capabilities` (nothing to configure).
   WorkAdventure reads capabilities when play starts: restart play after upgrading AdminSpace.
2. Each pusher then sends `POST /api/presence/report` with the full list of its people, a few seconds after any change
   and at least every `ttlSeconds / 3` ([ADMIN_API.md](ADMIN_API.md#whos-in-post-apipresencereport)).
3. AdminSpace resolves each play URL to one of its rooms with the same resolver as `/api/map`, keeps only the people in
   its own rooms, and replaces the pusher's previous report in one upsert.
4. The page reads the reports that still hold, keeps the people of the viewer's organization (and of the worlds the
   viewer may see), and adds the member pages and accounts.

**Storage**: one row per pusher in `presence_reports` (`instance_id`, `reported_at`, `received_at`, `expires_at`, and
the people as a JSON list). A report is a whole-list replacement sent every few seconds and read only by this page:
one row per pusher makes it a single atomic upsert, with no delete-and-insert of hundreds of rows per report and no
partial state visible in between; there are only a handful of pushers. Every AdminSpace instance writes and reads the
same rows, so the page is right whichever instance a pusher or a viewer reaches. Each stored person holds the
identifier, name, signed-in flag, status, connection time and the AdminSpace ids of the organization, world and room;
the raw play URL is not stored.

**Staleness**: a report holds `ttlSeconds` (clamped to 15–600 seconds) from when AdminSpace received it. A pusher that
stops or loses AdminSpace stops renewing its report, and its people disappear from the page once it expires. An older
report never replaces a newer one of the same pusher (out-of-order delivery). Expired rows are never read; they are
deleted when the next report arrives (at most once a minute per process) and by the hourly retention run.

## Privacy

- **Who can see it**: the `presence.view` permission, held by the roles that can already see members (viewer,
  moderator, admin, owner) and by workspace managers for the worlds of their workspace. Employees and platform
  administrators on support access do not hold it. A viewer only ever sees people in rooms of their own organization:
  the organization is checked on the stored ids, and each world against the viewer's rights in its workspace.
- **How long**: only until the report's ttl; nothing historical is stored. There is no log of who was connected when,
  no audit entry per report, and the page keeps no history in the browser either.
- **What**: people outside AdminSpace's rooms (`/~/` and `/_/` maps, unknown worlds) are dropped on reception.
  Identifiers longer than an email can be are dropped; names are cut at 200 characters.
- Viewing the page is not audited (it is a read of live data, like the live view of a world).

## Limits

- 5,000 people per report, 2.5 MB per body (`413` above). The Node server's `BODY_SIZE_LIMIT` (default 512K) applies
  first: set it to at least `3M` when a single pusher serves thousands of people.
- WorkAdventure must use this server as its Admin API (`ADMIN_API_URL`) and know the capability (restart play after an
  AdminSpace upgrade). Without reports the page shows its empty state.

## Code and tests

- `src/lib/presence/model.ts` (pure: statuses, ttl, grouping), `src/lib/server/services/presence.ts` (storage,
  resolution, reading), `src/lib/server/adminApi/handlers/presence.ts` (endpoint), `src/routes/(app)/o/[org]/presence/`.
- `tests/presence.pure.test.ts`: status mapping, staleness, duplicates, grouping and counts.
- `tests/presence.db.test.ts`: authentication, invalid bodies (400), size limits (413), capability, replacement per
  pusher and out-of-order reports, expiry and purge, play URL resolution, isolation between organizations and
  workspaces, member and account links, the members list's "online now".
