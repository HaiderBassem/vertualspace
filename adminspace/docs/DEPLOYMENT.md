# Deploying Adminspace in production

This guide deploys Adminspace with Docker Compose on one Linux host: a Caddy reverse proxy that serves
the back office over HTTPS, the Adminspace container, and PostgreSQL 17. WorkAdventure reaches the Admin
API over a private Docker network, never through the public proxy.

Day-to-day operations (health, logs, alerts, backups, incidents) are in [OPERATIONS.md](OPERATIONS.md).

Files:

| File                                                                                       | Purpose                                                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`deploy/docker-compose.prod.yaml`](../deploy/docker-compose.prod.yaml)                    | Proxy, Adminspace and PostgreSQL services, networks and volumes   |
| [`deploy/Caddyfile`](../deploy/Caddyfile)                                                  | TLS, blocking of the Admin API paths, request ids                 |
| [`deploy/.env.prod.example`](../deploy/.env.prod.example)                                  | Every setting, with placeholders. Copy it to `deploy/.env.prod`   |
| [`deploy/workadventure.override.yaml`](../deploy/workadventure.override.yaml)              | Override for WorkAdventure's production compose file              |
| [`scripts/backup.sh`](../scripts/backup.sh), [`scripts/restore.sh`](../scripts/restore.sh) | Backups and restores (see [OPERATIONS.md](OPERATIONS.md#backups)) |

## Architecture

```mermaid
graph LR
    Browser -- "HTTPS 443" --> Caddy
    subgraph host [Docker host]
        subgraph edge [network edge]
            Caddy -- "http :3000, except /api /oauth /white-label (404)" --> AS[adminspace]
        end
        subgraph internal ["network internal (internal: true)"]
            AS --> PG[(postgres)]
        end
        subgraph wa ["network workadventure-admin (external, internal)"]
            Play[WorkAdventure play] -- "Admin API http://adminspace:3000" --> AS
            Back[WorkAdventure back] -- "Admin API" --> AS
        end
    end
    AS -- "pusher /rooms, /ws/admin/rooms (WorkAdventure's public URL)" --> Play
```

- Only Caddy publishes ports (80, 443 TCP and 443 UDP for HTTP/3). Adminspace and PostgreSQL publish
  none.
- `internal` is an `internal: true` network: PostgreSQL has no route to or from anything but Adminspace.
- The Admin API (`/api/*`, `/oauth/*`, `/white-label/*`) answers `404` on the public side. Caddy matches
  paths case-insensitively and after decoding and cleaning them, so `/API/x`, `//api/x`, `/%61pi/x`,
  `/x/../api/x` are refused too (verified, see the end of this page).
- Adminspace runs as uid 1000 (`node`), with a read-only root file system, a 64 MB tmpfs on `/tmp`, all
  Linux capabilities dropped and `no-new-privileges`. Caddy runs with only `NET_BIND_SERVICE`.

## Prerequisites

- A Linux host with Docker Engine 24+ and the Compose plugin 2.24+ (`docker compose version`).
- A DNS name for the back office (`admin.example.com`) pointing to the host, with ports 80 and 443
  reachable from the Internet (Let's Encrypt HTTP-01 and TLS-ALPN-01 challenges).
- WorkAdventure deployed with Docker Compose on the **same host** (the private network is a local Docker
  bridge). For WorkAdventure on another host, see [Other topologies](#other-topologies).
- `openssl` to generate secrets.
- Sizing: see [Resource sizing](#resource-sizing). 1 vCPU and 1 GB of RAM are enough for the three
  containers of a small instance.

## 1. Build the image

From the Adminspace checkout:

```sh
docker build -t adminspace:0.1.0 .
```

or let Compose build it (`docker compose ... up -d --build` builds `ADMINSPACE_IMAGE` from the checkout).
Use one tag per release: rolling back is then "set the previous tag and `up -d`". In a registry
workflow, build and push in CI, set `ADMINSPACE_IMAGE=registry.example.com/adminspace:0.1.0` and run
`docker compose pull` instead of `--build`.

The image contains the server (`build/index.js`), the CLI tools (`build/cli/*.js`), the migrations
(`drizzle/`) and production dependencies only. Its entrypoint applies pending migrations, then starts
the server.

## 2. Configure

```sh
cp deploy/.env.prod.example deploy/.env.prod
chmod 600 deploy/.env.prod
openssl rand -hex 32   # run once per secret: POSTGRES_PASSWORD, ADMIN_API_TOKEN, ADMIN_SOCKETS_TOKEN, APP_SECRET
```

Edit `deploy/.env.prod`. Docker Compose reads it with `--env-file` and passes each value to the right
container (see the `environment:` blocks of the compose file). Required values use `${VAR:?}`: Compose
refuses to start without them, and Adminspace refuses the placeholder values (`change-me...`) in
production. Optional settings must stay **commented out** when unused: an empty value (`VAR=`) is passed
as an empty string, which Adminspace refuses for URLs and `SETUP_TOKEN`.

Validate the file before starting:

```sh
docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod config -q
```

### Configuration reference

**Deployment (read by Compose and Caddy)**

| Variable                                                                 | Default               | Description                                                                                                                                                   |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMINSPACE_DOMAIN`                                                      | required              | DNS name of the back office. Caddy's site address; `ORIGIN` is derived from it.                                                                               |
| `ACME_EMAIL`                                                             | required              | Let's Encrypt account e-mail (expiry notices).                                                                                                                |
| `TLS_MODE`                                                               | `acme`                | `acme`: public certificate obtained and renewed by Caddy. `internal`: Caddy's own CA (tests, private networks with your own trust store).                     |
| `HTTP_PORT`, `HTTPS_PORT`                                                | `80`, `443`           | Published ports of the proxy. Keep the defaults in production (ACME).                                                                                         |
| `ORIGIN_PORT_SUFFIX`                                                     | empty                 | `:8443` when `HTTPS_PORT` is not 443, so that `ORIGIN` matches the browser's address.                                                                         |
| `ADMINSPACE_IMAGE`                                                       | `adminspace:latest`   | Image of the adminspace service (built or pulled).                                                                                                            |
| `POSTGRES_USER`, `POSTGRES_DB`                                           | `adminspace`          | Role and database created on the first start of the volume.                                                                                                   |
| `POSTGRES_PASSWORD`                                                      | required              | Password of that role. Hexadecimal recommended: it is inserted into `DATABASE_URL` as is. Only applied when the volume is created (see [rotation](#secrets)). |
| `WORKADVENTURE_ADMIN_NETWORK`                                            | `workadventure-admin` | External Docker network shared with WorkAdventure's play and back.                                                                                            |
| `ADMINSPACE_MEMORY_LIMIT`, `POSTGRES_MEMORY_LIMIT`, `PROXY_MEMORY_LIMIT` | `512M`, `1G`, `256M`  | Memory limits of the containers.                                                                                                                              |
| `NODE_OPTIONS`                                                           | unset                 | e.g. `--max-old-space-size=384` to keep the V8 heap below the memory limit.                                                                                   |

**Adminspace (validated at start-up by `src/lib/server/config.ts`)**

| Variable                                        | Default in compose | Description                                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                      | `production`       | Set by the compose file and the image. Production refuses weak secrets, enables HSTS and `__Host-` cookies.                                                                                                            |
| `DATABASE_URL`                                  | derived            | `postgres://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB`, built by the compose file.                                                                                                                     |
| `ADMIN_API_TOKEN`                               | required           | Shared with WorkAdventure (play and back): identical on both sides, 32+ characters. WorkAdventure sends it in the `Authorization` header of every Admin API call; Adminspace uses it to call the pusher.               |
| `ADMIN_SOCKETS_TOKEN`                           | unset              | Shared with WorkAdventure's play: signs the JWTs of `/ws/admin/rooms` (live list of people, live disconnection on bans). 32+ characters. Optional.                                                                     |
| `APP_SECRET`                                    | required           | 32+ characters. Derives the AES-256-GCM key of 2FA secrets and of secrets stored in settings, and keys the HMAC of recovery codes and pseudonymized identifiers. See [rotation](#secrets).                             |
| `SETUP_TOKEN`                                   | unset              | Enables the web setup (`/setup`) in production, protected by this token (16+ characters). Remove it once the first account exists.                                                                                     |
| `DEFAULT_LOCALE`                                | `en-US`            | BCP 47 locale when the browser asks for none of `en-US`, `fr-FR`, `de-DE`, `es-ES`, `ar-SA`.                                                                                                                           |
| `SESSION_TTL_HOURS`                             | `12`               | A session unused this long expires.                                                                                                                                                                                    |
| `SESSION_ABSOLUTE_HOURS`                        | `168`              | Maximum session lifetime, whatever the activity.                                                                                                                                                                       |
| `SESSION_MAX_PER_ACCOUNT`                       | `20`               | Active sessions per account; the oldest end beyond it.                                                                                                                                                                 |
| `REQUIRE_MFA`                                   | `true`             | Every back-office account must set up TOTP. The compose default is `true` (the application default is `false`).                                                                                                        |
| `LOG_REQUESTS`                                  | `true`             | One JSON line per request on stdout (see [OPERATIONS.md](OPERATIONS.md#logs)).                                                                                                                                         |
| `RATE_LIMIT_ADMIN_API_PER_MINUTE`               | `600`              | Admin API calls per client address and minute. WorkAdventure's calls arrive over the private network without `X-Forwarded-For`, so they share one bucket: raise it for busy instances, `0` disables it.                |
| `RATE_LIMIT_LOGIN_PER_IP`                       | `30`               | Login attempts per 15 minutes and client address.                                                                                                                                                                      |
| `RATE_LIMIT_LOGIN_PER_ACCOUNT`                  | `10`               | Login attempts per 15 minutes and targeted account.                                                                                                                                                                    |
| `RATE_LIMIT_MFA_PER_IP`                         | `30`               | Second-factor attempts per 15 minutes and client address.                                                                                                                                                              |
| `RATE_LIMIT_SETUP_PER_IP`                       | `10`               | Web setup attempts per hour and client address.                                                                                                                                                                        |
| `RATE_LIMIT_SENSITIVE_PER_ACCOUNT`              | `20`               | Password, 2FA and e-mail changes per 15 minutes and account.                                                                                                                                                           |
| `RATE_LIMIT_REGISTRATION_PER_IP`                | `10`               | Public registrations per hour and client address.                                                                                                                                                                      |
| `RATE_LIMIT_PASSWORD_RESET_PER_IP`              | `10`               | Password reset requests per hour and client address.                                                                                                                                                                   |
| `RATE_LIMIT_INVITATIONS_PER_ORGANIZATION`       | `200`              | Invitations per hour and organization.                                                                                                                                                                                 |
| `RATE_LIMIT_COMPONENT_CHANGES_PER_ORGANIZATION` | `120`              | Component uploads, installs, removals, rooms from templates and repairs per hour and organization (each queues map-storage work).                                                                                      |
| `COMPONENT_STORAGE_PER_ORGANIZATION_MB`         | `200`              | Storage for the components an organization uploads (`0`: no limit).                                                                                                                                                    |
| `BODY_SIZE_LIMIT`                               | `20M`              | Largest request body the application reads: component packages go up to 16 MB. The proxy keeps every other route under 2 MB (`deploy/Caddyfile`).                                                                      |
| `SMTP_URL`                                      | unset              | Mail relay for invitations, registration verification and password reset, e.g. `smtps://user:password@smtp.example.com:465`. Without it nothing is sent, and the pages say so (links shown to the inviter instead).    |
| `MAIL_FROM`                                     | required with SMTP | Sender address, e.g. `AdminSpace <no-reply@example.com>`.                                                                                                                                                              |
| `INVITATION_TTL_HOURS`                          | `168`              | Lifetime of invitation links.                                                                                                                                                                                          |
| `JOB_WORKER`                                    | `true`             | Runs the background jobs (map-storage changes) in this process. Keep it on in at least one instance; several share the queue safely.                                                                                   |
| `WORKADVENTURE_PLAY_URL`                        | unset              | Initial WorkAdventure URL (`https://play.example.com`). Editable later in **Platform › Instance settings**; these `WORKADVENTURE_*` values only seed the settings row the first time.                                  |
| `WORKADVENTURE_PUSHER_INTERNAL_URL`             | unset              | Base URL Adminspace uses for the pusher's `/rooms`, `/message`, `/room/refresh` and the `/ws/admin/rooms` websocket. WorkAdventure's public URL is the simplest choice: its own proxy routes `/ws/` to the right port. |
| `WORKADVENTURE_MAP_STORAGE_PUBLIC_URL`          | unset              | Public map-storage URL (`https://play.example.com/map-storage`).                                                                                                                                                       |
| `WORKADVENTURE_MAP_STORAGE_INTERNAL_URL`        | unset              | How Adminspace reaches map-storage to list maps.                                                                                                                                                                       |
| `WORKADVENTURE_MAP_STORAGE_API_TOKEN`           | unset              | map-storage API token (stored encrypted with `APP_SECRET` once saved in the settings).                                                                                                                                 |
| `WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN`       | unset              | Token map-storage sends to `/hooks/map-storage` (its `WEB_HOOK_API_TOKEN`; `WEB_HOOK_URL=http://adminspace:3000/hooks/map-storage`). Without it the webhook refuses every call.                                        |
| `WORKADVENTURE_START_ROOM_URL`                  | unset              | Copy of WorkAdventure's `START_ROOM_URL`: with an admin, WorkAdventure asks Adminspace where `/` leads.                                                                                                                |
| `SKIP_MIGRATIONS`                               | `false`            | Read by the entrypoint: `true` starts the server without applying migrations (see [Upgrades](#upgrades)).                                                                                                              |
| `ADMIN_PASSWORD`                                | unset              | Read by `build/cli/create-superadmin.js` only, to avoid the interactive prompt.                                                                                                                                        |

`WORKADVENTURE_REPO` is only used by development scripts (contract sync, seeding from a checkout).

**Node.js server (`@sveltejs/adapter-node`)**

| Variable                                        | Value in compose               | Description                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORIGIN`                                        | `https://${ADMINSPACE_DOMAIN}` | Public origin. Used for CSRF checks of form posts: a wrong value makes every login answer `403`.                                                            |
| `BODY_SIZE_LIMIT`                               | `2M`                           | Maximum request body. The CSV member import accepts up to 1 MB (Caddy also caps bodies at 2 MB).                                                            |
| `ADDRESS_HEADER`                                | `X-Forwarded-For`              | Where the client address is. Caddy replaces any client-supplied `X-Forwarded-For` with the real address, so the header cannot be spoofed through the proxy. |
| `XFF_DEPTH`                                     | `1`                            | Number of trusted proxies (Caddy). Raise it if a CDN or load balancer sits in front of Caddy, and declare it in Caddy's `trusted_proxies`.                  |
| `PORT`, `HOST`                                  | `3000`, `0.0.0.0` (image)      | Listening address.                                                                                                                                          |
| `SHUTDOWN_TIMEOUT`                              | `20`                           | Seconds the server waits for in-flight requests after `SIGTERM` (`stop_grace_period` is 30 s).                                                              |
| `KEEP_ALIVE_TIMEOUT`, `HEADERS_TIMEOUT`         | Node.js defaults               | Optional, seconds.                                                                                                                                          |
| `PROTOCOL_HEADER`, `HOST_HEADER`, `PORT_HEADER` | unset                          | Not needed: `ORIGIN` is set.                                                                                                                                |
| `TZ`                                            | `UTC` (image)                  | Process time zone. Data is UTC whatever its value.                                                                                                          |

### Secrets

The application reads its configuration from environment variables only, so secrets reach the container
as environment variables. Trade-offs of the options:

| Option                                                                                  | Pros                                                       | Cons                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`--env-file deploy/.env.prod`, mode 0600, owned by root or the deploy user (chosen)** | One file, no code change, works with every Compose feature | Values are visible to anyone who can run `docker inspect` or `docker compose config` (members of the `docker` group are root-equivalent anyway) and in `/proc/<pid>/environ` to the same uid. |
| Docker secrets (`secrets:` mounted as files in `/run/secrets`)                          | Not in `docker inspect`; per-service access                | Adminspace does not read `*_FILE` variables: it would need a wrapper entrypoint that exports the files, which this deployment avoids. PostgreSQL alone could use `POSTGRES_PASSWORD_FILE`.    |
| An external secret manager (Vault, SOPS, cloud KMS) rendering `deploy/.env.prod`        | Central audit and rotation                                 | More moving parts; the rendered file has the same properties as the first option.                                                                                                             |

Rules: never commit `deploy/.env.prod` (`.gitignore` covers `.env.*`), keep it out of backups that are
less protected than the database backups, and never paste `docker compose config` output in tickets.
Back up `APP_SECRET` separately from database dumps (a password manager or vault): a dump restored without
it loses every 2FA secret and stored integration secret.

**Rotation.**

- **`ADMIN_API_TOKEN`** must be identical in Adminspace and in WorkAdventure's play and back. There is no
  overlap period: change it in both env files, then restart both sides together
  (`docker compose ... up -d` for Adminspace, then for WorkAdventure). Between the two restarts every
  Admin API call is refused with `403` and players cannot enter rooms, so do it in a quiet period.
- **`ADMIN_SOCKETS_TOKEN`**: same procedure, with WorkAdventure's play only. Until both sides match, the
  live list and live disconnection are unavailable.
- **`APP_SECRET`**: changing it makes unreadable, permanently:
    - every TOTP secret: people with 2FA cannot log in until a superadmin resets their second factor
      (**Platform › Accounts › Reset 2FA**), and they set it up again;
    - every recovery code;
    - the secrets stored in settings (Jitsi, BigBlueButton, LiveKit secrets, map-storage token): enter
      them again in **Platform › Instance settings** and in world settings;
    - the continuity of pseudonymized identifiers (analytics actors, erasure records).

    Rotate it only after a suspected leak: plan the 2FA resets, keep the old value until the new one
    works, and take a backup first.

- **`POSTGRES_PASSWORD`**: the image applies it only when the volume is first created. To change it:

    ```sh
    docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod exec postgres \
        psql -U adminspace -d adminspace -c "ALTER ROLE adminspace PASSWORD 'NEW_HEX_PASSWORD'"
    # then set POSTGRES_PASSWORD=NEW_HEX_PASSWORD in deploy/.env.prod and recreate adminspace:
    docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod up -d adminspace
    ```

- **`SETUP_TOKEN`**: remove it after the first account exists.

## 3. First start

```sh
# Once per host: the private network shared with WorkAdventure. --internal: no outside access through it.
docker network create --internal workadventure-admin

docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod up -d --build --wait
docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod ps
```

Startup order: PostgreSQL becomes healthy, Adminspace applies the migrations (`Database migrations
applied.` in its log) and starts listening, becomes healthy (`/healthz`), then Caddy starts and obtains
the certificate. Check:

```sh
curl -sI https://admin.example.com/login                  # 200 or 303 to /setup, Strict-Transport-Security
curl -s -o /dev/null -w '%{http_code}\n' https://admin.example.com/api/capabilities   # 404: blocked
```

To avoid typing the long command, define an alias on the host:

```sh
alias adminspace-compose='docker compose -f /opt/adminspace/deploy/docker-compose.prod.yaml --env-file /opt/adminspace/deploy/.env.prod'
```

The rest of this guide writes `docker compose ...` for that command.

## 4. Create the first superadmin

Recommended: the command line inside the container. The password is read from `ADMIN_PASSWORD`, or asked
without echo on a terminal:

```sh
docker compose ... exec adminspace node build/cli/create-superadmin.js --email ops@example.com --name "Ops"
```

Running it again with an existing e-mail changes nothing. With `REQUIRE_MFA=true` (the compose default),
the first login leads to the 2FA setup; save the recovery codes.

Alternative, the web setup: set `SETUP_TOKEN` (16+ random characters) in `deploy/.env.prod`, run
`docker compose ... up -d adminspace`, open `https://admin.example.com/setup` and enter the token. Then
remove `SETUP_TOKEN` and run `up -d adminspace` again. `/setup` redirects to `/login` as soon as an
account exists.

## 5. Import the avatar catalog

WorkAdventure sends players back to the Woka selection screen until Adminspace knows the textures, and
texture ids must be WorkAdventure's own. Copy the catalog out of WorkAdventure's play image, then import
it. From WorkAdventure's compose directory:

```sh
docker compose cp play:/usr/src/play/src/pusher/data ./wa-catalog      # woka.json, companions.json
```

The Adminspace root file system is read-only, so `docker compose cp` into the adminspace container
fails (`container rootfs is marked read-only`). Use either:

```sh
# a. one-off container with the catalog mounted read-only (applies pending migrations first)
docker compose ... run --rm --no-deps -v "$PWD/wa-catalog:/catalog:ro" adminspace node build/cli/seed.js --from /catalog

# b. stream it into the running container's /tmp (tmpfs)
docker compose ... exec -T adminspace mkdir -p /tmp/wa-catalog
tar -C wa-catalog -cf - . | docker compose ... exec -T adminspace tar -xf - -C /tmp/wa-catalog
docker compose ... exec -T adminspace node build/cli/seed.js --from /tmp/wa-catalog
```

Expected output: `Avatar catalog seeded from …: 296 Woka textures, 6 companions.` (counts depend on the
WorkAdventure version). The import is idempotent: run it again after a WorkAdventure upgrade.

### 5b. Publish the built-in component pack

The office furniture and room templates of `catalog/builtin` (original artwork, see `catalog/builtin/README.md`)
are published for every organization by an explicit command; nothing is published at start-up:

```sh
docker compose ... exec -T adminspace node build/cli/catalog-import.js
# created        desk-classic … / unchanged …
# catalog: 32 imported or up to date, 0 refused
```

Each package is validated first (same rules as uploads). The command is idempotent: run it after every
AdminSpace upgrade.

Players' browsers load the components from AdminSpace itself: `ORIGIN`/`wa/worlds/{id}/collection.json` and
`ORIGIN`/`wa/assets/…` must be reachable from the Internet (the production proxy serves them; they need no
session and allow cross-origin reads). Rooms only receive furniture when their map is a WAM file on the
map-storage configured in **Control Center › Instance settings** (with its API token).

## 6. Connect WorkAdventure

WorkAdventure calls Adminspace; Adminspace calls WorkAdventure only for live features. Over the private
network, WorkAdventure's play and back reach Adminspace at `http://adminspace:3000`.

1. Both stacks join the `workadventure-admin` network (Adminspace's compose file already does).
2. Apply [`deploy/workadventure.override.yaml`](../deploy/workadventure.override.yaml) to WorkAdventure's
   production compose file, and add `ADMIN_API_TOKEN`, `ADMIN_SOCKETS_TOKEN` and `ADMINSPACE_DOMAIN` to
   WorkAdventure's `.env`:

    ```sh
    cd <workadventure>/contrib/docker
    docker compose -f docker-compose.prod.yaml -f /opt/adminspace/deploy/workadventure.override.yaml up -d
    ```

The override sets, on WorkAdventure's side:

| Service    | Variable                       | Value                               | Why                                                                                                                                                                                      |
| ---------- | ------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| play, back | `ADMIN_API_URL`                | `http://adminspace:3000`            | Every Admin API call, over the private network.                                                                                                                                          |
| play, back | `ADMIN_API_TOKEN`              | shared secret                       | Must equal Adminspace's.                                                                                                                                                                 |
| play       | `ADMIN_URL`                    | `http://adminspace:3000`            | The pusher calls `/api/members/{id}/chatId`, `/api/ice-servers` and `/api/oauth/refreshtoken` through `ADMIN_URL`, not `ADMIN_API_URL`: with the public URL, the proxy would answer 404. |
| play       | `ADMIN_BO_URL`                 | `https://admin.example.com`         | Link to the back office.                                                                                                                                                                 |
| play       | `OPID_PROFILE_SCREEN_PROVIDER` | `https://admin.example.com/profile` | Profile page opened in WorkAdventure (otherwise derived from `ADMIN_URL`).                                                                                                               |
| play       | `ADMIN_SOCKETS_TOKEN`          | shared secret                       | Live list and live disconnection.                                                                                                                                                        |
| uploader   | `ADMIN_API_URL`                | empty                               | With it, the uploader asks the admin for `/api/limit/fileSize`, which Adminspace does not implement: chat uploads would fail.                                                            |

`ADMIN_URL` is also sent to browsers, which then see the private name `http://adminspace:3000`. WorkAdventure
only uses it in the browser for pages of its hosted admin (pricing, registration) that Adminspace does not
have, so nothing breaks; if you prefer a public `ADMIN_URL`, allow exactly those three paths in the
Caddyfile (they still require `ADMIN_API_TOKEN`) instead.

3. In Adminspace, **Platform › Instance settings**: WorkAdventure play URL, pusher URL (WorkAdventure's
   public URL), map-storage URLs and token.
4. Restart play and back whenever Adminspace's capabilities change (ICE servers, LiveKit): WorkAdventure
   reads `GET /api/capabilities` once at start-up.

Check: play's log shows `Remote admin api connection successful at http://adminspace:3000`, and from the
private network the Admin API answers:

```sh
docker run --rm --network workadventure-admin busybox wget -qO- http://adminspace:3000/api/capabilities
```

### Other topologies

- **WorkAdventure on another host**: there is no shared Docker network. Use a private link (WireGuard,
  VPC) and publish Adminspace's port 3000 on the private interface only (`ports: ["10.0.0.5:3000:3000"]`
  in an override), with a host firewall that admits only WorkAdventure's hosts. Never publish 3000 on a
  public address: the Admin API would bypass the proxy's blocking (it stays protected by
  `ADMIN_API_TOKEN`, but defense in depth is lost).
- **Several Adminspace replicas**: the rate limits and sessions live in PostgreSQL, so replicas can share
  the database. Each replica runs the hourly retention job and applies migrations on start: set
  `SKIP_MIGRATIONS=true` and run migrations as a one-off job (see Upgrades).

## TLS

Caddy obtains and renews the certificate automatically (`TLS_MODE=acme`) and redirects HTTP to HTTPS.
Certificates and the ACME account live in the `caddy-data` volume: keep it across upgrades, or Let's
Encrypt rate limits may block re-issuance. HSTS (`max-age=31536000; includeSubDomains`) is sent by
Adminspace in production. HTTP/3 uses UDP 443.

`TLS_MODE=internal` uses Caddy's local CA (`curl -k`, or trust the root from
`/data/caddy/pki/authorities/local/root.crt` in the proxy container): for tests and private networks.

Caddy does not write access logs on purpose: it logs full URIs with query strings, and some URLs carry
tokens. Adminspace logs every request without the query string, with the request id Caddy generates.

## Upgrades

Migrations are forward-only: there are no down migrations. Each run applies all pending migrations in
one transaction (see [Migrations](#migrations-in-depth)): a failing migration leaves the database
exactly as before and the container exits (and is restarted by Docker, failing again until fixed).

1. **Back up** (see [OPERATIONS.md](OPERATIONS.md#backups)):

    ```sh
    scripts/backup.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod --output-dir /var/backups/adminspace
    ```

2. Get the new version: `git pull` (or set the new `ADMINSPACE_IMAGE` tag), read the release notes and
   `drizzle/` for new migrations.
3. Build or pull: `docker compose ... build adminspace` (or `pull adminspace`).
4. Apply: `docker compose ... up -d --wait adminspace`. The new container applies the migrations, then
   starts. The old one receives `SIGTERM` first.

With migrations run separately (one-off job, several replicas, or to see them fail without touching the
running version): set `SKIP_MIGRATIONS=true` in `deploy/.env.prod`, then:

```sh
docker compose ... run --rm --no-deps adminspace node build/cli/migrate.js   # uses the new image
docker compose ... up -d --wait adminspace
```

A migration that only adds tables or nullable/defaulted columns is compatible with the previous version,
which keeps running during the job. A migration that renames or drops something is not: stop the old
version first (`docker compose ... stop adminspace`).

Upgrading PostgreSQL to a new major version (18) needs `pg_dump`/restore into a new volume: back up,
change the image, start on an empty volume, restore with `scripts/restore.sh`.

## Rollback

There are no down migrations. To go back to the previous version:

- **No migration in the release**: set the previous `ADMINSPACE_IMAGE` tag and `up -d adminspace`.
- **With migrations**: the previous version may not work with the new schema. Restore the backup taken
  before the upgrade, then start the previous image:

    ```sh
    docker compose ... stop adminspace
    scripts/restore.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod --force \
        /var/backups/adminspace/adminspace_<timestamp>.dump
    # ADMINSPACE_IMAGE=<previous tag> in deploy/.env.prod
    docker compose ... up -d --wait adminspace
    ```

    Changes made since the backup are lost: keep the upgrade window short, or export what changed.

## Graceful shutdown

On `docker compose stop`/`up -d`, Docker sends `SIGTERM`. adapter-node stops accepting connections and
waits up to `SHUTDOWN_TIMEOUT` (20 s) for in-flight requests, then the process should exit; Docker sends
`SIGKILL` after `stop_grace_period` (30 s). PostgreSQL gets 60 s to write its shutdown checkpoint (the
image stops with `SIGINT`, a fast shutdown). Caddy drains in 15 s.

Known limitation (measured): once Adminspace has made one database query, its idle PostgreSQL connections
keep the Node.js process alive after the HTTP server closed, so it exits only when Docker sends `SIGKILL`
at the end of `stop_grace_period` (exit code 137, about 30 s). In-flight requests are still completed
first, so no request is lost, but stops and upgrades take 30 s. The application needs to close its
database pool on `sveltekit:shutdown` to exit at once.

## Resource sizing

Measured idle on the reference stack: Adminspace 35 MB, PostgreSQL 50 MB, Caddy 50 MB of RAM, under 1 %
CPU. Starting points:

| Size                             | Adminspace              | PostgreSQL                             | Notes                                                                                                 |
| -------------------------------- | ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Small (< 200 concurrent players) | 0.5 vCPU, 512 MB limit  | 0.5 vCPU, 1 GB limit, 5 GB disk        | Default limits.                                                                                       |
| Medium (< 2 000 players)         | 1 vCPU, 1 GB            | 1-2 vCPU, 2 GB, `shared_buffers=512MB` | Raise `RATE_LIMIT_ADMIN_API_PER_MINUTE` (every player entering a room costs several Admin API calls). |
| Large                            | 2 replicas behind Caddy | dedicated server, SSD, PITR backups    | Each replica holds up to 10 database connections (pool size): keep `max_connections` above the sum.   |

Disk: the database grows mainly with members, audit entries and analytics; retention settings bound
them (see [OPERATIONS.md](OPERATIONS.md#retention)). Keep at least twice the database size free for
dumps and restores. Logs rotate at 5 × 10 MB per container (`json-file` options in the compose file).

## Migrations in depth

- Files: `drizzle/NNNN_name.sql`, listed in `drizzle/meta/_journal.json`. Applied ones are recorded in
  `drizzle.__drizzle_migrations` (SHA-256 of the file, `created_at` = the journal's `when`).
- drizzle-orm 0.45's migrator (`node_modules/drizzle-orm/pg-core/dialect.js`, `PgDialect.migrate`)
  creates the bookkeeping table outside of any transaction, reads the last applied `created_at`, then runs
  every pending migration and its bookkeeping row inside one `session.transaction()`, implemented with
  postgres.js `sql.begin()` (`node_modules/drizzle-orm/postgres-js/session.js`). An interrupted or
  failing run therefore rolls back entirely, including earlier migrations of the same run.
- Consequences for authors: statements that cannot run in a transaction (`CREATE INDEX CONCURRENTLY`,
  `VACUUM`, using a new enum value in the same migration as `ALTER TYPE ... ADD VALUE`) cannot be used in
  migrations. A migration whose journal `when` is older than the last applied one is silently skipped:
  always generate migrations with `npm run db:generate`.
- No advisory lock: two containers starting at once may both try; one fails on a conflict, rolls back
  and is restarted. With replicas, use `SKIP_MIGRATIONS=true` and a one-off job.
- `tests/db/migrations.test.ts` checks a fresh install against the latest snapshot, an upgrade with data
  from `0000_init`, idempotency, and the rollback of a migration failing halfway.

## Verification of this deployment

The compose file was validated by building the image and running the stack locally (`TLS_MODE=internal`,
`ADMINSPACE_DOMAIN=localhost`, published on 18080/18443, a throwaway project and network):

| Check                                                                                                                                                                                         | Result                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `config -q` with `deploy/.env.prod.example`                                                                                                                                                   | exit 0                                                                   |
| All three services `healthy`, root file systems read-only                                                                                                                                     | yes (`touch /app/x`: Read-only file system; `/tmp` writable)             |
| Published ports                                                                                                                                                                               | proxy only; postgres and adminspace: none                                |
| `id` in adminspace                                                                                                                                                                            | `uid=1000(node) gid=1000(node)`                                          |
| Migrations on start                                                                                                                                                                           | `Database migrations applied.`, 2 rows in `drizzle.__drizzle_migrations` |
| `/`, `/login`, `/setup`, `/healthz`, `/readyz` over HTTPS                                                                                                                                     | 303 / 303 / 200 / 200 / 200                                              |
| `/api/capabilities`, `/api`, `/API/capabilities`, `//api/capabilities`, `/%61pi/capabilities`, `/api%2Fcapabilities`, `/./api/…`, `/x/../api/…`, `/oauth/logout`, `/white-label/cf-challenge` | 404 from Caddy (no `Via` header: never proxied)                          |
| `http://adminspace:3000/api/capabilities` from the private network                                                                                                                            | 200, JSON                                                                |
| `postgres` from the private WorkAdventure network                                                                                                                                             | not resolvable                                                           |
| Spoofed `X-Forwarded-For: 6.6.6.6`                                                                                                                                                            | ignored; the logged `ip` is the real client                              |
| Spoofed `X-Request-Id`                                                                                                                                                                        | replaced by Caddy's id                                                   |
| Login through the proxy                                                                                                                                                                       | `__Host-` session cookie, redirect to 2FA setup (`REQUIRE_MFA`)          |
| Login with `Origin: https://evil.example`                                                                                                                                                     | 403                                                                      |
| Superadmin CLI, catalog import (both methods), retention CLI, one-off migrate                                                                                                                 | exit 0                                                                   |
| PostgreSQL stopped, then started                                                                                                                                                              | `/readyz` 503 then 200, `/healthz` 200 throughout, no restart            |
