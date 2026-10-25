# Desks

Every employee can have a desk in the office, decorate it, and keep it; desks can also be hot desks that anyone sits
at, shared by a few people, or reserved for someone for a while. Administrators see and manage all desks from one page.
This document says where desks live, who may do what, who enforces it, the limits, and how it was verified.

## Where a desk lives

A desk is an **area of a room's WAM file** (in map-storage) that carries a `personalAreaPropertyData` property
(WorkAdventure's schema: `libs/map-editor/src/types.ts`; every key below except the first four is optional, so desks
made before them keep working):

| Field             | Meaning                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ownerId`         | Who has it: the `userUuid` WorkAdventure knows the person by (the lower-case email of a signed-in person), or `null`.                                    |
| `accessClaimMode` | `dynamic`: employees claim it themselves. `static`: only an administrator assigns it.                                                                    |
| `allowedTags`     | When not empty, only people holding one of these tags can claim it or sit at it.                                                                         |
| `disabled`        | Out of service: nobody can claim it. The people it belongs to keep it and can still sit at it.                                                           |
| `deskType`        | How it is used: `assigned` (absent means this: a personal desk of one person), `hot` (belongs to nobody), `shared` (belongs to its owner and co-owners). |
| `coOwnerIds`      | The other people a shared desk belongs to. Ignored by WorkAdventure unless the desk is shared.                                                           |
| `ownerName`       | The name shown on the desk in the office while its owner is away (at most 64 characters).                                                                |
| `reservations`    | Times when the desk is kept for one person: `{ id, userId, userName?, start, end }`, instants in ISO 8601 UTC, active while `start <= now < end`.        |
| `seats`           | Places to sit drawn in the map picture `{ x, y, direction }`. Chairs placed as objects are found by WorkAdventure itself and are not listed here.        |

There is **no second desk database**: the WAM file is the only place a desk exists, so the game, the back office and
map-storage can never disagree. AdminSpace stores nothing about desks (`src/lib/desks/model.ts` reads and patches them,
`src/lib/server/services/desks.ts` is the service, `src/routes/(app)/o/[org]/desks` the page).

### Sitting at a desk claims it

A person who sits at a seat of a free personal desk they may claim (claim mode `dynamic`, in service, open to their tags,
not reserved for somebody else) becomes its owner at that moment, under their name, and keeps it after standing up or
leaving, until they free it (the same claim a walk into the desk offers). Sitting at another free desk moves their claim
there: the first one is freed. Hot desks, shared desks, desks taken by someone else and desks only an administrator
assigns are never claimed by sitting.

### Which furniture can be sat on

WorkAdventure offers a seat on any piece of furniture whose **name** says it is one: chair, armchair, stool, bench, couch,
sofa, pouf, seat, beanbag, chaise, ottoman, hammock, swing, lounger, recliner, deckchair, settee, loveseat
(`libs/map-editor/src/PersonalDesk/Seats.ts`). Furniture of WorkAdventure's own collections says its name in its
identifier. The furniture of AdminSpace has an identifier that does not (`adminspace:<component>:<variant>`), so the
name comes from the world's entity collection (`/wa/worlds/<id>/collection.json`, the name of the component): the browser
reads it from the collection it loaded, and the room server (back) reads the collections listed in the map file
(`back/src/Model/SeatPrefabCatalog.ts`: read like maps are, refusing local addresses, kept five minutes). Name a component
for what it is ("Beanbag", "Garden bench") and it can be sat on in every world where it is installed.

### Kinds of desks

- **Personal desk** (`assigned`): belongs to one person, who claims a free one (when `dynamic`) or is given one.
- **Hot desk** (`hot`): belongs to nobody and is never claimed. Anyone it is open to (tags) sits at it while a seat is
  free, unless it is reserved for someone right now. AdminSpace refuses to give a hot desk to someone.
- **Shared desk** (`shared`): belongs to its owner and its co-owners, chosen by an administrator (employees cannot claim
  it). Only they can sit at it. A co-owner counts as having a desk: each person has one desk per room.

The people a desk belongs to (owner, plus co-owners on a shared desk) are its **holders**. A desk with holders is theirs
alone, even out of service, whatever reservation it may carry. A **reservation** only makes sense on a desk without
holders: during it, only that person can sit at the desk (whatever its tags) and, on a personal `dynamic` desk, claim it.

### States shown to administrators

**Available** (belongs to nobody), **Free hot desk**, **Reserved now** (a reservation is going on: for whom and until
when), **Claimed** (belongs to an employee who has been in the office), **Assigned, not joined** (status `reserved` in
the code: given to somebody who has not joined yet, such as an invited employee), **Shared**, **Out of service**. Holders
come first, then out of service, then a reservation going on, as in WorkAdventure. The page also counts the
reservations to come, and lists every reservation of a desk (going on, to come, over).

## What administrators can do (Desks, in the organization menu)

Needs `room.manage` in the workspace of the room (administrators and owners everywhere; workspace managers in their
workspace). Every action checks that again from the room itself, never from what the form says.

- See every desk of every office on a floor plan (one outline per state, never color alone, with a legend; seats drawn on
  the map are shown) and in a table (type, claim mode, tags, seats; who it belongs to, name shown on the desk; status;
  reservations going on and next), with search (desk, owner, co-owners, people it is reserved for) and filters (status,
  type, room, workspace).
- Assign a desk to a person (their name is written on the desk), or reserve it for somebody who has not joined. A desk
  that has somebody is only taken over after an explicit confirmation; a person who already has a desk in the room
  (as owner or co-owner) is only moved if asked; a desk with reservations to come is only given after confirming that
  they are cancelled (the people are told).
- Free a desk (the name shown on it is cleared), take it out of service or put it back, rename it, choose who can claim
  it and who it is open to (tags, the same rule as the tags of a world), remove desks that belong to nobody and have no
  reservation to come.
- Change how a desk is used, in a confirmation dialog that says who loses it: becoming a hot desk frees it, no longer
  being shared removes its co-owners.
- Choose the co-owners of a shared desk (one email per line).
- Reserve a desk for a person between two times typed in the administrator's time zone (their account's, else UTC, said
  next to the form), cancel a reservation, remove the reservations that are over.
- Add a grid of free desks (personal, hot or shared) to a room, in tiles of the map. Nothing is added if one would leave
  the map or overlap another desk.
- Assign or reserve several desks at once: `Desk 1, alice@company.com` assigns, `Desk 2, bob@company.com,
2026-11-02..2026-11-06` (or one day) reserves whole days in the administrator's time zone; each line is reported.
- The person concerned is emailed (in their language and time zone, else the administrator's, the zone named) when a
  desk is assigned to them, taken from them, shared with them, reserved for them, or their reservation is cancelled
  (purpose `desk_changed`, recorded in the email log even when no mail server is configured).
- Every change is in the audit log: `desk.assign`, `desk.release`, `desk.disable`, `desk.enable`, `desk.rename`,
  `desk.claim_mode`, `desk.tags_changed`, `desk.type_changed`, `desk.coowners_changed`, `desk.reserved`,
  `desk.reservation_cancelled`, `desk.reservations_cleared`, `desk.create`, `desk.delete`.

### Changes are compare-and-set

Each change is a JSON Patch that starts with `test` operations on what it depends on (the desk at that position, its
owner, its type, its co-owners, its reservations, whether it is out of service). If an employee claimed or released the
desk, or another administrator changed it, in the meantime, map-storage refuses the whole patch and the page says to
reload; nothing is overwritten. Two reservations made at the same time therefore cannot overlap.

A JSON Patch cannot test that a key is absent (map-storage applies patches with `fast-json-patch` and validation: a `test`
needs a value, and `remove` fails on a missing path). So when a key a change depends on is not in the file (desks made
before desk types, or hand-written), the change tests the **whole property** instead, which covers its absence too;
once the key has been written, only that key is tested. Keys are only ever removed when they are there.

### When a person leaves

Suspending, removing, or leaving the organization (one at a time or in bulk) and revoking an invitation take that person
out of every desk of the organization: the desks they own are freed (and their name cleared), they are removed from the
co-owners of shared desks, and their reservations going on or to come are cancelled, one compare-and-set change per
room. They are not emailed. **What they put on a desk stays**: nothing an employee made is destroyed by an ordinary
change of desk. This never blocks the change that triggered it: if map-storage cannot be reached, `desk.release_failed`
is written to the audit log and the Desk Manager keeps showing the desk as theirs.

### For integrations

After each change saved in map-storage (a desk given, freed, reserved, a reservation cancelled, also when a person
leaves), the service calls `onDeskChanged(event)` (`src/lib/server/services/deskEvents.ts`). It does nothing until a
listener is registered with `setDeskEventListener()`; a listener cannot fail or delay the change (errors are logged).

## Who enforces what

Employees only ever act through WorkAdventure, which decides with shared code
(`libs/map-editor/src/PersonalDesk/DeskEligibility.ts`, `SitPolicy.ts`):

| Rule                                                                                                                                                                        | Enforced by                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Claim a desk: personal, `dynamic`, in service, no holder, open to their tags, not reserved for someone else now                                                             | map-storage (`PersonalDeskPolicy.ts`), the browser only offers it |
| The person a desk is reserved for may claim it and sit at it whatever its tags                                                                                              | map-storage (claims), the back (sitting)                          |
| One desk per person in a map, co-owners counted                                                                                                                             | map-storage                                                       |
| A released desk does not keep the name of its former owner                                                                                                                  | map-storage                                                       |
| Sit: one person per seat; a desk with holders only for them; out of service, reserved for someone else, or tags refuse                                                      | the back (`SitPolicy.ts`)                                         |
| Who may change desks from the back office, every check above for administrators (hot desks given to nobody, reservations only on desks without holders, no overlap, limits) | AdminSpace (`src/lib/desks/model.ts`, service)                    |
| Nothing overwritten on a stale view                                                                                                                                         | map-storage, through the `test` operations AdminSpace sends       |

| Request from a non-editor in WorkAdventure                                                                                               | Answer                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Claim a free `dynamic` personal desk they are eligible for                                                                               | accepted                                  |
| Claim an occupied desk                                                                                                                   | `DESK_TAKEN`                              |
| Claim a `static`, hot or shared desk                                                                                                     | `DESK_NOT_CLAIMABLE`                      |
| Claim a desk reserved for somebody else right now                                                                                        | `DESK_RESERVED`                           |
| Claim a desk that is out of service                                                                                                      | `DESK_DISABLED`                           |
| Claim a desk open only to a tag they do not have, when it is not reserved for them                                                       | `DESK_NOT_ELIGIBLE`                       |
| Claim a second desk (or one while co-owning another)                                                                                     | `DESK_ALREADY_OWNED`                      |
| Give, take or release somebody else's desk; move, resize or delete any desk                                                              | refused                                   |
| Place, move or delete an object on their own desk                                                                                        | accepted                                  |
| Place or move an object outside their own desk (including by forging a size), touch an object that is not theirs, delete a shared object | `ENTITY_OUTSIDE_EDITABLE_AREA` or refused |

A refused command is answered to the sender only (it is neither applied nor broadcast); the browser rolls back and says
why. Editors keep full control. `PATCH /*.wam` (the path AdminSpace uses) flushes the live map first, patches, validates
the result against the WAM schema, writes, then drops the live copy (`map-storage/src/Services/WamPatchService.ts`).

## Limits

| What                                                    | Limit                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Length of a reservation                                 | 30 days                                                                         |
| How far ahead a reservation starts                      | 365 days                                                                        |
| Reservations going on or to come on one desk            | 50 (those that are over are dropped when a reservation is added, or on request) |
| Co-owners of a shared desk                              | 20                                                                              |
| Tags of a desk                                          | 20, each 1 to 64 characters, no comma, no space around                          |
| Name shown on a desk, name stored with a reservation    | 64 characters (longer names are cut, never in the middle of a character)        |
| Desks added at once, lines of a bulk change, rooms read | 200, 100, 200                                                                   |

The reservation limits are `RESERVATION_LIMITS` in `src/lib/server/services/desks.ts` (`DEFAULT_RESERVATION_LIMITS` in the
model; `reserveDesk` also takes other limits).

## Verification

| What                                                                                                                                                                                                                                                                                                                                                                                              | Result                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Desk model, filters and bulk lines (`tests/desks.pure.test.ts`): reading, states at a fixed instant, reservation rules, every patch with its checks (on files with and without the new keys), the patch helper refusing what fast-json-patch refuses                                                                                                                                              | 112 passed                       |
| Desk service against Postgres and the fake map-storage (`tests/desks.db.test.ts`), which now refuses like map-storage a `test` without value and a `remove` of a missing path                                                                                                                                                                                                                     | 62 passed                        |
| Mutation checks: no whole-property fallback (37 tests fail), no check of the reservation list when adding (3 fail), no overlap rule (2 fail), giving a reserved desk without confirmation (1 fails)                                                                                                                                                                                               | all caught, then restored        |
| The patches applied with WorkAdventure's own `WAMFileFormat`, migration and `fast-json-patch` (as map-storage's PATCH route does), and the results asked to WorkAdventure's `DeskEligibility`, `SitPolicy` and map-storage's `PersonalDeskPolicy` (owner, name, hot desk, reservation keeping the desk, reserved person claiming without the tag, shared desk holders, stale patches refused)     | 37 of 37                         |
| Browser run of the Desk Manager (isolated copy, test database, fake map-storage): every state on the plan and in the table, reserve, overlap refused, change of type with and without an owner, co-owners refused then saved, cancel and clear reservations, assign a reserved desk with and without confirmation, bulk lines, tags, 500 px wide, Arabic RTL, French typography, no console error | done                             |
| Earlier rounds (before desk types): real map-storage started from source (35 of 35), player-side attacks over real gRPC (28 of 28), the whole employee journey in a real browser on WorkAdventure built from source (19 of 19)                                                                                                                                                                    | see the history of this document |

## Known limits

- Freeing a desk always **keeps** what was on it. There is no "clear the desk when it is freed" option yet.
- Reservations are made by administrators (one by one or in bulk); employees cannot book a desk from WorkAdventure yet,
  and there is no waiting list or recurring reservation. AdminSpace does not show who is sitting where right now: the
  seat of a player is live state of the back, not data of the map.
- WorkAdventure's browser helper `isDeskClaimableBy` still asks the person a desk is reserved for to hold its tag, while
  map-storage (which decides) does not: such a person is not offered the claim in the browser, but can sit at the desk.
- Times typed in the Desk Manager are in the time zone of the administrator's account, or UTC when the account has none.
- On a phone, the per-desk forms are in the table's own horizontal scroll area (the page itself never scrolls sideways).
- After an action, the browser tab shows the application's name instead of "Desks" until the next navigation (the root
  layout sets the title again; it does so on every page).
