# Integration Center

AdminSpace connects the virtual office to the tools a team already uses. Administrators manage the organization's
connections in **Integrations** (`/o/{org}/integrations`, permission `integration.manage`: admins and owners); every
person connects their own calendar, code and music accounts in **My integrations** (`/o/{org}/my-integrations`,
permission `integration.personal`: every role). Code: `src/lib/server/integrations/`.

What "Connected" means: a connection is shown **Connected** only after a real successful call to the provider (the
token exchange followed by an identity call, a "Test the connection", a verified inbound webhook, or a delivered
event). Without the provider's configuration on this server, the page says **Not configured** and lists the setup
steps; nothing is simulated.

## Catalog

| Provider        | Category     | Connected by            | Method                               | What it does in the office                                                        |
| --------------- | ------------ | ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Google Calendar | Calendars    | each person             | OAuth 2.0 + PKCE S256, offline       | meetings or free/busy in WorkAdventure (`GET /api/calendar/events`), Slack status |
| Microsoft 365   | Calendars    | each person             | Microsoft identity v2, PKCE + secret | same                                                                              |
| Slack           | Chat         | organization and person | OAuth v2 (bot scopes / user scope)   | events posted to channels; a person's status "In a meeting" during meetings       |
| Discord         | Chat         | organization            | channel webhook URL                  | events posted to a channel (Discord has no API to set a person's status)          |
| Microsoft Teams | Chat         | organization            | Workflows webhook URL                | events posted as Adaptive Cards                                                   |
| GitHub          | Developer    | each person + org hook  | OAuth app + PKCE; signed webhooks    | "coding in acme/api" for people who share it (`GET /api/presence/activity`)       |
| GitLab          | Developer    | each person + org hook  | OAuth + PKCE; secret-token webhooks  | same                                                                              |
| Notion          | Productivity | organization            | public integration (OAuth)           | pages to place in rooms (WorkAdventure "open a website" objects)                  |
| Trello          | Productivity | organization            | API key + 30-day read token          | boards to place in rooms                                                          |
| Miro            | Productivity | organization            | OAuth 2.0                            | boards with their live embed URL                                                  |
| Spotify         | Music        | each person (opt-in)    | authorization code + PKCE            | "now playing", only while the person shares it                                    |
| Zapier, n8n     | Automation   | organization            | webhook URL + automation tokens      | events start Zaps/workflows; they invite people and send announcements            |
| Webhooks        | Automation   | organization            | any HTTPS URL, Standard Webhooks     | signed events to your own systems                                                 |

## Common configuration

Every OAuth redirect URI is built from `ORIGIN`, never from the request:

    {ORIGIN}/integrations/oauth/{provider}/callback

For example `https://admin.example.com/integrations/oauth/google/callback`. Register it exactly in the provider's
console. Provider credentials are environment variables (see `.env.example`); a provider appears as soon as its
variables are set (restart AdminSpace). Client secrets stay in the environment; tokens obtained from providers are
sealed in the database (AES-256-GCM, key derived from `APP_SECRET`).

Public routes that the reverse proxy must let through (the production Caddyfile already does; it only blocks `/api`,
`/oauth`, `/white-label` and `/hooks`):

| Path                                       | Who calls it              | Authentication                                    |
| ------------------------------------------ | ------------------------- | ------------------------------------------------- |
| `/integrations/oauth/{provider}/callback`  | people's browsers         | back-office session + single-use `state`          |
| `/integrations/webhooks/slack`             | Slack Events API          | `X-Slack-Signature` (signing secret, 5 minutes)   |
| `/integrations/webhooks/github/{receiver}` | GitHub                    | `X-Hub-Signature-256` with the receiver's secret  |
| `/integrations/webhooks/gitlab/{receiver}` | GitLab                    | `X-Gitlab-Token` (the receiver's secret token)    |
| `/automation/v1/*`                         | Zapier, n8n, your scripts | `Authorization: Bearer as_at_…` automation tokens |

## Providers

### Google Calendar (personal)

1. Google Cloud console › APIs & Services: enable the **Google Calendar API**.
2. OAuth consent screen: add the scopes `openid`, `email`, `.../auth/calendar.events.readonly` and
   `.../auth/calendar.freebusy`. While the app is in **testing**, only its test users can connect and refresh tokens
   expire after 7 days: publish it (verification may be needed for the calendar scopes).
3. Credentials › OAuth client ID › Web application; authorized redirect URI: `{ORIGIN}/integrations/oauth/google/callback`.
4. `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

Flow: `https://accounts.google.com/o/oauth2/v2/auth` with `access_type=offline&prompt=consent`, PKCE S256; token
`https://oauth2.googleapis.com/token`; revocation `https://oauth2.googleapis.com/revoke`. Access tokens last about an
hour and are refreshed automatically; a refresh answering `invalid_grant` (password change, consent withdrawn, testing
app) marks the connection **Expired**: the person reconnects. The granted `scope` is checked: people can untick scopes.

Data minimization: by default a person shares **free/busy only** and AdminSpace calls the `freeBusy` API, which returns
busy intervals without titles. Titles, places and Meet links are read (`events.list`) only when the person chooses
"Titles, places and meeting links". Quota errors (403 `rateLimitExceeded`/`usageLimits`, 429) are reported as
`rate_limited`. Push notifications (`events.watch`) need a public HTTPS callback per calendar and are not used:
AdminSpace reads on demand with a 60-second cache, and a background sync runs only for people who enabled their Slack
status.

### Microsoft 365 / Outlook (personal)

1. Microsoft Entra admin center › App registrations › New registration; platform **Web**, redirect URI
   `{ORIGIN}/integrations/oauth/microsoft/callback`.
2. Certificates & secrets › new client secret. API permissions (delegated): `openid`, `offline_access`, `User.Read`,
   `Calendars.ReadBasic`. Your tenant may require an administrator to **grant consent** before employees can connect.
3. `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_TENANT` (a tenant id or domain;
   default `organizations`, any work or school account).

Refresh tokens **rotate**: every refresh returns a new one, stored at once, under a lease so that two instances never
refresh with the same token. Events come from `GET /v1.0/me/calendarView` with `Prefer: outlook.timezone="UTC"`; busy
means `showAs` is `busy` or `oof`. Graph throttling (429 + `Retry-After`) is honoured. There is no API to revoke one
application's tokens (Graph's `revokeSignInSessions` would sign the person out everywhere): disconnecting deletes the
tokens here and the page links to https://myapplications.microsoft.com.

### Slack (organization and personal)

1. https://api.slack.com/apps › Create New App. OAuth & Permissions: redirect URL `{ORIGIN}/integrations/oauth/slack/callback`;
   **bot** scopes `chat:write`, `chat:write.public`, `incoming-webhook`; **user** scope `users.profile:write`.
2. Optional, Event Subscriptions: Request URL `{ORIGIN}/integrations/webhooks/slack`, bot events `app_uninstalled`
   and `tokens_revoked` (AdminSpace then marks the matching connections **Revoked** at once).
3. `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` (Basic Information › Signing Secret).

The organization install keeps the bot token and turns the incoming webhook of the channel chosen on Slack's consent
screen into a notification destination; other channels can be added by name (`chat.postMessage` with
`chat:write.public`, no need to invite the bot to public channels) or with pasted incoming-webhook URLs. People connect
their own account (user scope only) to let AdminSpace set their status to "In a meeting" (`users.profile.set`, with
`status_expiration` at the end of the meeting, at most once per meeting) during busy events of their connected calendar.

Slack answers errors with HTTP 200 and `ok: false` (handled), tokens do not expire unless **token rotation** is enabled
(supported: 12-hour access tokens, single-use refresh tokens stored at each refresh). Events API requests are verified:
`v0=` + HMAC-SHA256(signing secret, `v0:{timestamp}:{raw body}`), timestamps older than five minutes refused, constant-time
comparison, `url_verification` echoed, answered immediately.

### Discord (organization)

Channel settings › Integrations › Webhooks › New Webhook › Copy Webhook URL, then add it on the Notifications page.
Messages are embeds sent to `POST {url}?wait=true` (API v10) with `allowed_mentions: { parse: [] }` (nobody is pinged)
and escaped markdown. 429 answers are retried after `retry_after`. A webhook answering 401/403/404 is paused at once and
any destination failing 10 times in a row is paused: Discord bans addresses that send too many invalid requests.
Discord has no API to set a user's status.

### Microsoft Teams (organization)

Office 365 connectors (incoming webhooks on `*.webhook.office.com`) are retired; such URLs are refused with an
explanation. In Teams: **Workflows** › "Send webhook alerts to a channel", choose the team and channel, copy the URL
(hosts `*.logic.azure.com` or `*.powerplatform.com`). AdminSpace posts
`{ "type": "message", "attachments": [{ "contentType": "application/vnd.microsoft.card.adaptive", "content": AdaptiveCard 1.4 }] }`;
the workflow answers `202 Accepted`.

### GitHub (personal + organization webhook)

Personal: GitHub › Settings › Developer settings › **OAuth Apps** › New; callback URL
`{ORIGIN}/integrations/oauth/github/callback`; `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`. Scope
`read:user` (PKCE S256). People who enable "Show my coding activity" share their latest push or pull request of the
last two hours. Polling uses `GET /users/{login}/events` with `If-None-Match` (a 304 is free) and never more often than
`X-Poll-Interval`; with `read:user` it sees public activity only. Revocation: `DELETE /applications/{client_id}/grant`.

Organization webhook (private repositories too): on the GitHub page of the Integration Center, **Create the webhook
receiver**; copy the payload URL and the secret (shown once) into the repository or organization webhook settings,
content type `application/json`, events "push" (and "pull requests"). GitHub's `ping` proves the receiver
(**Connected**). Deliveries are verified (`X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(secret, raw body)) and
de-duplicated on `X-GitHub-Delivery`; a push counts only for a person who connected the same GitHub account and shares
their activity.

### GitLab (personal + organization webhook)

Personal: User or group settings › **Applications**; redirect URI `{ORIGIN}/integrations/oauth/gitlab/callback`;
confidential; scope `read_user`. `GITLAB_BASE_URL` (default `https://gitlab.com`), `GITLAB_CLIENT_ID`,
`GITLAB_CLIENT_SECRET`. Access tokens last two hours; refresh tokens rotate (stored at each refresh). The events API
(`/api/v4/events?after=…`) does not name projects with `read_user`: GitLab activity appears in the office once the
organization webhook names the project (WorkAdventure's contract requires the repository).

Organization webhook: **Create the webhook receiver**, then in GitLab › Settings › Webhooks: URL and **Secret token**,
triggers push and merge request events; use **Test** to prove it. GitLab sends the secret token itself in
`X-Gitlab-Token` (compared in constant time); deliveries are de-duplicated on `X-Gitlab-Event-UUID`/`Idempotency-Key`.
GitLab 19 also signs with Standard Webhooks headers; the token check already authenticates the delivery.

### Notion (organization)

https://www.notion.so/profile/integrations › New integration › type **Public**; redirect URI
`{ORIGIN}/integrations/oauth/notion/callback`; capability "Read content". `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`.
The person who connects chooses the pages to share (`owner=user`). Token requests use Basic authentication with JSON
bodies; every call sends `Notion-Version: 2026-03-11`. Pages come from `POST /v1/search` and are listed with "Copy the
link". There is no revocation call: after disconnecting, remove AdminSpace in Notion (Settings › Connections). Notion
webhooks are not used (the verification token is only delivered in the first request body); `verifyNotionSignature`
(`X-Notion-Signature` = `sha256=` + HMAC-SHA256(verification token, raw body)) is implemented and tested for
deployments that add a subscription.

### Trello (organization)

Flow chosen: Trello's own authorization with an API key and a **read** user token valid **30 days** (Atlassian OAuth 2.0
3LO for Trello is not used). https://trello.com/power-ups/admin › your Power-Up › API key; add `{ORIGIN}` to the
allowed origins; `TRELLO_API_KEY`. AdminSpace registers no Trello webhook and reads boards on demand
(`verifyTrelloSignature`, `X-Trello-Webhook` = base64(HMAC-SHA1(application secret, raw body + callback URL)), is
implemented and tested for deployments that add one). Trello returns the token in the URL **fragment** of
`{ORIGIN}/integrations/oauth/trello/callback?state=…`; the callback page reads it once, removes it from the address bar
and posts it with the state. The token is sent to Trello in the `Authorization: OAuth oauth_consumer_key=…, oauth_token=…`
header, never in a query string, and revoked with `DELETE /1/tokens/{token}`. After 30 days the connection is
**Expired**: reconnect.

### Miro (organization)

https://miro.com/app/settings/user-profile/apps › Create new app; redirect URI `{ORIGIN}/integrations/oauth/miro/callback`;
scope `boards:read`; `MIRO_CLIENT_ID`, `MIRO_CLIENT_SECRET`. Token requests carry their parameters in the query string;
with expiring tokens enabled, access tokens last an hour and refresh tokens (60 days) rotate. Miro retired webhooks:
boards are read on demand (`GET /v2/boards`). Each board offers "Copy the embed link":
`https://miro.com/app/live-embed/{board_id}/`, to paste into a WorkAdventure "open a website" object.

### Spotify (personal, opt-in)

https://developer.spotify.com/dashboard › Create app; redirect URI `{ORIGIN}/integrations/oauth/spotify/callback` —
Spotify only accepts **HTTPS** redirect URIs or `http://127.0.0.1:PORT` (never `localhost`); `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`; scope `user-read-currently-playing` (PKCE S256). In **development mode** an app serves at most
5 people who must be on its allowlist, and its owner needs Spotify Premium. Nothing is shown until the person enables
"Show what I am listening to"; `GET /v1/me/player/currently-playing` answering 204 or a paused player shows nothing.
No revocation API: people remove the app at https://www.spotify.com/account/apps/.

### Zapier and n8n (organization)

No Zapier app is needed. **Events out**: in Zapier, trigger "Webhooks by Zapier" › Catch Hook, and add its URL
(`https://hooks.zapier.com/hooks/catch/…`) as a Zapier destination; in n8n, a Webhook node (POST) whose production URL
becomes an n8n destination. A self-hosted n8n on a private network must be allowed with
`INTEGRATION_ALLOWED_PRIVATE_HOSTS` (plain http is accepted only for those hosts). Use **Send a test event** to check.
**Actions in**: create an automation token (Integrations › Automation API) and call the automation API with
`Authorization: Bearer <token>` (Zapier: "Webhooks by Zapier" › POST; n8n: HTTP Request node, credential "Bearer Auth").

### Webhooks (Standard Webhooks)

Every webhook, Zapier and n8n destination gets its own signing secret (`whsec_` + base64 of 32 random bytes, shown
once, rotatable). Requests are `POST` with `content-type: application/json` and the body
`{ "type": "member.joined", "timestamp": "2026-10-24T09:00:00.000Z", "data": { … } }`, signed per
https://www.standardwebhooks.com:

    webhook-id: <delivery id, stable across retries>
    webhook-timestamp: <unix seconds>
    webhook-signature: v1,<base64(HMAC-SHA256(base64-decoded secret, "{id}.{timestamp}.{body}"))>

Receivers verify the signature in constant time, refuse timestamps more than five minutes away and de-duplicate on
`webhook-id`. Answer 2xx quickly; `410 Gone` disables the destination.

## Events

| Type                  | When                                                                      | `data`                                                        |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `member.invited`      | an invitation is created (team page, automation API, platform owner)      | `invitation { id, email, role, expiresAt }`, `invitedBy`      |
| `member.joined`       | a signed-in person enters a world for the first time (`/api/room/access`) | `person { id, name, email }`, `world { id, slug, name, url }` |
| `member.suspended`    | a membership is suspended                                                 | `person`, `by`                                                |
| `member.removed`      | a person is removed or leaves                                             | `person`, `by`, `reason: removed \| left`                     |
| `desk.assigned`       | a desk is assigned (Desk Manager)                                         | `desk`, `room`, `world`, `person`, `by`                       |
| `desk.released`       | a desk is freed (Desk Manager)                                            | `desk`, `room`, `world`, `person`, `by`, `reason`             |
| `office.announcement` | a message is broadcast (live page, automation API)                        | `message`, `world`, `rooms`, `by`, `via`                      |
| `integration.test`    | "Send a test event" (to one destination only)                             | `message`, `by`                                               |

Anonymous visitors never produce `member.joined`. Chat messages (Slack blocks, Discord embeds, Teams cards) are written
in the organization's default language.

**Emitting events from code** (`src/lib/server/integrations/events.ts`):

```ts
// Inside the transaction of the change (outbox: the event exists if and only if the change is committed).
await emitOrgEvent(tx, organizationId, "member.suspended", { person, by });
// Changes made outside a transaction (the Desk Manager after a map-storage patch): never throws.
await emitDeskEvent(organizationId, "desk.assigned", { desk, room, world, person, by });
await emitDeskEvent(organizationId, "desk.released", { desk, room, world, person, by, reason: "released" });
```

`emitOrgEvent` stores the event only when an enabled destination subscribes to it, creates one delivery per destination
and enqueues one `integration.deliver` job each, with the idempotency key `integration.deliver:{event id}:{endpoint id}`.

**Delivery** (`deliveries.ts`): 2xx delivered; 429 retried after `Retry-After` (Discord: `retry_after`); 408, 5xx and
network errors retried with exponential backoff (8 attempts, about two hours); 410 disables the destination; 401/403/404
from a chat webhook disables it; other 4xx and redirects fail without retry; 10 failures in a row pause the destination.
The **Delivery log** lists every attempt with filters (status, destination, event) and retries failed deliveries once the
destination is active. Events and deliveries are deleted after 30 days.

## Automation API

Base URL `{ORIGIN}/automation/v1`, header `Authorization: Bearer as_at_…`. Tokens are created in Integrations ›
Automation API (shown once, SHA-256 stored, revocable, optional expiry, scopes). A token acts with the **current**
rights of the person who created it: if that person loses the role or leaves, the token stops working. Limits:
`RATE_LIMIT_AUTOMATION_PER_TOKEN` calls per minute and token (default 60), and a per-address limit before
authentication. Every authenticated call is in the organization's audit log. Errors are RFC 9457 problem documents
with a `code`.

| Method and path           | Scope                 | Body                                                                      | Answer                                                                 |
| ------------------------- | --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /automation/v1/ping` | —                     | —                                                                         | `{ ok, organization { slug, name }, token, actingAs }`                 |
| `POST …/invitations`      | `invitations:write`   | `{ email, role? (employee), workspace? (slug), workspaceRole?, locale? }` | `201 { status: "invited", invitationId, delivery, inviteUrl? }`        |
| `POST …/announcements`    | `announcements:write` | `{ world (slug), message (≤ 1000), room? (slug) }`                        | `200 { status: "sent", rooms }`, `502` if WorkAdventure is unreachable |

`inviteUrl` is returned only when no email could be sent (as in the back office). Codes: `unauthenticated` (401),
`insufficientScope`, `forbidden`, `forbiddenRole` (403), `invalidBody`, `invalidEmail`, `invalidJson` (400),
`alreadyMember` (409), `unsupportedMediaType` (415), `rateLimited` (429), `workadventureUnavailable` (502).

## WorkAdventure

`GET /api/calendar/events` and `GET /api/presence/activity` are documented in [ADMIN_API.md](ADMIN_API.md). They are
advertised in `GET /api/capabilities` (`"api/calendar/events": "v1"`, `"api/presence/activity": "v1"`) once a calendar
(or a music/code) provider is configured; restart WorkAdventure's play and back after configuring one, as they read
capabilities at startup.

## Security summary

- `state`: 256 bits, SHA-256 stored, single use (atomic consumption), 10 minutes, bound to the account and provider;
  PKCE S256 where supported (verifier sealed at rest). The callback re-checks the person's permission.
- Tokens, webhook URLs, signing and receiver secrets are sealed (AES-256-GCM); automation tokens are hashed. Pages and
  audit entries never contain them.
- Refreshes run under a lease (`refresh_locked_until`) and an in-process single flight; rotated refresh tokens are
  stored at once; `invalid_grant`/401 after a refresh → **Expired**, tokens wiped.
- Outgoing requests to URLs typed by people go through `guardedRequest.ts`: https only, no credentials in URLs, no
  redirects followed, private/loopback/link-local addresses refused at connection time (no DNS rebinding window), 10 s
  timeout, bounded answer size.
- Inbound webhooks: raw-body verification, constant-time comparison, replay windows and de-duplication.
- Every query is scoped by organization; deliveries reference their endpoint and event through composite foreign keys
  that include the organization.
- Audit: `integration.connect`, `integration.connect_failed`, `integration.test`, `integration.disconnect`,
  `integration.revoke`, `integration.settings`, `integration.receiver_setup`, `integration.receiver_remove`,
  `integration.endpoint_create|update|pause|resume|test|rotate|delete`, `integration.delivery_retry`,
  `automationToken.create`, `automationToken.revoke`, `automation.ping`, `automation.refused`.
- People who leave the organization: their personal connections stop at once and are revoked at the provider by the
  `integration.revoke` job, then deleted.

## Limits and what is not covered

- Live provider calls were not exercised in this repository's tests (no credentials): adapters are tested against
  recorded answer shapes with a mocked fetch, the database flows against a fake provider, deliveries against a real
  local HTTP server.
- Google Calendar push channels, Notion and Trello webhooks are not used (polling on demand).
- One calendar per person and organization (Google or Microsoft).
