# Operating Adminspace

Runbook for an Adminspace deployed with [`deploy/docker-compose.prod.yaml`](../deploy/docker-compose.prod.yaml)
(see [DEPLOYMENT.md](DEPLOYMENT.md)). Commands write `docker compose ...` for
`docker compose -f deploy/docker-compose.prod.yaml --env-file deploy/.env.prod`.

## Health endpoints

| Endpoint   | Checks                      | Answers                                    | Use                                                                                                       |
| ---------- | --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `/healthz` | the Node.js process answers | `200 ok`                                   | Liveness: the Docker healthcheck of the adminspace container.                                             |
| `/readyz`  | `select 1` on PostgreSQL    | `200 ready`, or `503 database unavailable` | Readiness and monitoring. Not used as the Docker healthcheck: a database outage must not restart the app. |

Both are served publicly through Caddy (`https://admin.example.com/readyz`) and privately
(`http://adminspace:3000/readyz`), and are not written to the request log.

Behaviour on database loss (tested in `tests/db/readyz.test.ts`, and on the compose stack by stopping
PostgreSQL): `/readyz` answers `503` at once when the database refuses connections or its name does not
resolve, `/healthz` stays `200`, back-office pages and Admin API calls answer `500`, and everything
recovers by itself when the database is back, without restarting Adminspace.

Caveat: if the database host silently drops packets (firewall, network partition), the first query waits
for the driver's connect timeout, 30 seconds, before `/readyz` answers `503`. Give the monitoring probe a
timeout of 5 to 10 seconds and treat a timeout as a failure.

The superadmin page **Platform › System status** (`/admin`) shows the database, applied versus known
migrations, the pusher and map-storage connectivity, the admin websocket, the capabilities sent to
WorkAdventure and the last retention run.

## Logs

Every container logs to Docker (`json-file`, rotated at 5 × 10 MB). Read them with
`docker compose ... logs -f adminspace`, or ship them with any Docker log collector (Vector, Fluent Bit,
Promtail).

Adminspace writes one JSON line per request (`LOG_REQUESTS=true`), without query strings, bodies or
cookies:

```json
{
    "time": "2026-10-22T21:37:47.875Z",
    "level": "info",
    "msg": "request",
    "requestId": "b3d2d4ef-767a-4bd8-a268-622bda30d241",
    "method": "GET",
    "path": "/setup",
    "route": "/setup",
    "status": 200,
    "durationMs": 4,
    "accountId": "…",
    "ip": "203.0.113.7"
}
```

| Field       | Meaning                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time`      | ISO 8601, UTC.                                                                                                                                                                                                                       |
| `level`     | `info`, `warn`, `error`.                                                                                                                                                                                                             |
| `msg`       | `request` for access lines, `unhandled error` for server errors (with an `error` object: `name`, `message`, `code`).                                                                                                                 |
| `requestId` | Request id: Caddy generates one per request (`X-Request-Id`), Adminspace logs it and returns it in the `X-Request-Id` response header. Ask people reporting an error for it, then `docker compose ... logs adminspace \| grep <id>`. |
| `path`      | Path only. `route` is the SvelteKit route (`/api/[...path]` for the whole Admin API).                                                                                                                                                |
| `status`    | HTTP status. `durationMs`: server time.                                                                                                                                                                                              |
| `accountId` | Back-office account, when logged in.                                                                                                                                                                                                 |
| `ip`        | Client address from `X-Forwarded-For` (set by Caddy). Absent for WorkAdventure's calls over the private network.                                                                                                                     |

Not logged: `/healthz`, `/readyz`, static assets, and redirects decided before the page runs (for example
the redirect of an anonymous visitor to `/login`).

Other lines: `Database migrations applied.` and `Listening on http://0.0.0.0:3000` at start-up (plain text,
PostgreSQL notices may be printed as objects during migrations), the hourly
`{"level":"info","message":"retention",…}` line with the number of deleted rows, `retention failed`, and
`A stored secret could not be decrypted (was APP_SECRET changed?)`.

Caddy writes its own operational logs (certificates, errors) but no access log (see DEPLOYMENT.md, TLS).

## What to alert on

| Signal                                                                                          | Meaning and first action                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/readyz` not `200` for 2 minutes                                                               | Database down or unreachable: [playbook](#database-down).                                                                                                                  |
| Container `unhealthy`, or its restart count increases (`docker inspect -f '{{.RestartCount}}'`) | Crash loop: `docker compose ... logs --tail 100 adminspace`. A failed migration or an invalid configuration exits at start-up with the reason.                             |
| Burst of `403` with `route` `/api/[...path]`                                                    | `ADMIN_API_TOKEN` differs between WorkAdventure and Adminspace: every player is refused. See [token rotation](#token-rotation).                                            |
| `429` with `route` `/api/[...path]`                                                             | Admin API rate limit reached. WorkAdventure's calls share one bucket (no client address on the private network): raise `RATE_LIMIT_ADMIN_API_PER_MINUTE` or set it to `0`. |
| `429` or many `400`/`303` on `/login`, `/login/mfa`                                             | Password guessing. Check the audit log, consider blocking the source address upstream.                                                                                     |
| Rate of `5xx` or `unhandled error` lines                                                        | Bugs or database errors: look up the `requestId`.                                                                                                                          |
| No `"message":"retention"` line for 2 hours, or a `retention failed` line                       | Retention job not running or failing: [retention](#retention).                                                                                                             |
| Newest dump older than 26 hours, or a failed backup unit                                        | Backups broken: [backups](#backups).                                                                                                                                       |
| Certificate expiring in less than 14 days                                                       | Caddy renews 30 days before expiry: check `docker compose ... logs proxy` (DNS, ports 80/443, Let's Encrypt rate limits).                                                  |
| `A stored secret could not be decrypted`                                                        | `APP_SECRET` changed or a settings value is corrupt: integration secrets (Jitsi, BigBlueButton, LiveKit, map-storage) must be entered again.                               |
| Disk usage above 80 % (Docker root, backup directory)                                           | PostgreSQL stops writing when the disk is full.                                                                                                                            |
| `"level":"error","msg":"job attempt failed"`, or **Control Center** shows failed jobs           | A change in WorkAdventure gave up after its retries: [background jobs](#background-jobs).                                                                                  |
| **Control Center** shows failed emails                                                          | The SMTP server refuses or is unreachable: invitations, registrations and resets are not delivered. Check `SMTP_URL`, then **Control Center › Email**.                     |
| `job worker failed`                                                                             | The worker cannot read the queue (database): [playbook](#database-down).                                                                                                   |

## Retention

Adminspace deletes data past its retention period (GDPR storage limitation):

- per world (**World › Settings › Privacy**): guests not seen for `guestRetentionDays` (0 keeps them),
  analytics older than `analyticsRetentionDays` (default 395 days);
- per instance (**Platform › Instance settings**): audit log entries, inactive bans (revoked or expired;
  active bans are kept), closed reports (open ones are kept), recording events;
- expired sessions;
- used or expired registration and password reset links, email delivery records older than 90 days,
  finished background jobs (succeeded or cancelled) older than 30 days; failed jobs are kept until
  someone retries or cancels them.

It runs in every Adminspace process one minute after start-up, then every hour. Each run logs one
`retention` line and, when it deleted something, writes a `retention.run` audit entry. **Platform › System
status** shows the last run (time, duration, outcome, counts) of the process that served the page: the
status is kept in memory, so it is empty during the first minute after a restart. Every step is an
idempotent `DELETE ... WHERE older than`: an interrupted run is safe to repeat.

Run it on demand:

```sh
docker compose ... exec adminspace node build/cli/retention.js
# Retention applied: 0 guests, 0 analytics events, 0 expired sessions deleted.
```

## Background jobs

Changes made in WorkAdventure (adding a world's component collection to a room's map, uploading a room
created from a template) run as durable jobs (`jobs` table), never inside a request:

- every process with `JOB_WORKER=true` (default) polls every 2 s and runs up to 4 jobs at once, each limited
  to 60 s; several instances share the queue (`FOR UPDATE SKIP LOCKED`); a job left `running` by a stopped
  process is taken again after 5 minutes;
- a failed attempt is retried after 5 s, 10 s, 20 s, … (at most 15 min, with jitter), 6 attempts in all; a
  refusal that retrying cannot fix (wrong token, map missing, map refused) fails at once;
- the room shows the state (**World › Components**: pending, failed and why, linked) and the organization's
  administrators can **Check and repair now**, which re-checks every room and re-arms the jobs;
- **Control Center › Background jobs** lists them with their attempts and last error (credentials removed),
  and retries or cancels one.

Jobs are idempotent: they read the map on map-storage first and only add what is missing, so retrying,
repairing or running two instances never duplicates anything.

## Email

Without `SMTP_URL` nothing is sent and the pages say so: invitation links are shown to the inviter to share
by another channel, password reset by email is unavailable, public registration with email verification
cannot be opened. With it, **Control Center › Email** lists every delivery (purpose, recipient, outcome,
error code); bodies are never stored, since they carry secret links.

## Component catalog

The built-in pack (`catalog/builtin`, original artwork) is published for every organization by
`node build/cli/catalog-import.js` (DEPLOYMENT.md). Run it again after an upgrade: unchanged components are
left alone, a changed manifest must carry a new version. **Control Center › Components** deprecates or hides
a component; installations keep working, new installations are refused. Organizations upload their own
packages (visible to them only) from **Components › Upload**. Each organization has an upload storage quota
(`COMPONENT_STORAGE_PER_ORGANIZATION_MB`) and an hourly budget of component changes. To take down an
organization's files (abuse), suspend the organization: its component files and collections stop being served.

## Support access

To look into an organization, a platform administrator opens it in **Control Center › Organizations**, gives a
reason and a duration (15 min, 1 h or 4 h) and starts a support access. The organization's audit log records
the start, every change made meanwhile (`via: "support"`) and the end; support never reaches the team,
ownership, integrations, secrets or deletions. End it from the banner or the same page.

## Backups

A dump contains every table: accounts with password hashes and encrypted 2FA secrets, members' e-mail
addresses, audit entries, settings with encrypted integration secrets. Treat backups like the database:
encrypted at rest, access-controlled, and copied off the host. Keep `APP_SECRET` (and the rest of
`deploy/.env.prod`) in a separate safe place: without it, a restored database loses 2FA and integration
secrets.

### Taking a backup

[`scripts/backup.sh`](../scripts/backup.sh) runs `pg_dump --format=custom` inside the PostgreSQL container
(same major version as the server), writes `adminspace_<YYYYMMDDTHHMMSSZ>.dump` (ISO 8601 basic format,
UTC) with mode 0600, checks that `pg_restore --list` can read it, writes a `.sha256` file next to it and
prunes old dumps. A failed run exits non-zero and leaves no partial file.

```sh
scripts/backup.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod \
    --output-dir /var/backups/adminspace --keep 14 --max-age-days 35
```

| Option                                                        | Default                                    | Meaning                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `--compose-file`, `--env-file`, `--project-name`, `--service` | service `postgres`                         | Run `pg_dump` with `docker compose exec` in that service.                                       |
| `--container NAME`                                            |                                            | Run it with `docker exec` in a container.                                                       |
| `--database-url URL` (or `DATABASE_URL`)                      |                                            | Run the local `pg_dump` (version 17 or newer) against that database.                            |
| `--dbname`, `--username`                                      | container's `POSTGRES_DB`, `POSTGRES_USER` | Database and role in the container modes.                                                       |
| `--output-dir`                                                | `$BACKUP_DIR` or `./backups`               |                                                                                                 |
| `--keep N`                                                    | 14                                         | Keep the N newest dumps (0: no count limit).                                                    |
| `--max-age-days D`                                            | 35                                         | Delete dumps older than D days (0: no age limit). The dump of the current run is never deleted. |
| `--prefix`                                                    | `adminspace`                               | File name prefix; only files with this prefix are pruned.                                       |

The dump is consistent (`pg_dump` uses one snapshot) and does not block Adminspace.

### Schedule

Daily at 02:30 UTC, with an off-host copy. With **cron** (`/etc/cron.d/adminspace-backup`):

```cron
30 2 * * * root cd /opt/adminspace && scripts/backup.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod --output-dir /var/backups/adminspace >>/var/log/adminspace-backup.log 2>&1 || logger -p user.err "adminspace backup failed"
```

With a **systemd timer** (failures are visible in `systemctl --failed` and can trigger `OnFailure=`):

```ini
# /etc/systemd/system/adminspace-backup.service
[Unit]
Description=Adminspace database backup
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/adminspace
ExecStart=/opt/adminspace/scripts/backup.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod --output-dir /var/backups/adminspace --keep 14 --max-age-days 35
# Off-host copy, e.g. with restic or rclone (encrypted remote):
# ExecStartPost=/usr/bin/rclone copy /var/backups/adminspace remote:adminspace-backups
```

```ini
# /etc/systemd/system/adminspace-backup.timer
[Unit]
Description=Daily Adminspace database backup

[Timer]
OnCalendar=*-*-* 02:30:00 UTC
RandomizedDelaySec=10m
Persistent=true

[Install]
WantedBy=timers.target
```

```sh
systemctl daemon-reload && systemctl enable --now adminspace-backup.timer
systemctl list-timers adminspace-backup.timer
```

Dumps are point-in-time copies: up to 24 hours of changes can be lost. For a smaller recovery point, run
the timer more often, or use continuous archiving (WAL archiving with pgBackRest or WAL-G) on a
dedicated PostgreSQL.

Restoring an old dump brings back data deleted since (retention, GDPR erasure requests). Keep a record of
erasure requests and apply them again after a restore.

### Restoring

[`scripts/restore.sh`](../scripts/restore.sh) checks the `.sha256` file, refuses a target database that
already has tables unless `--force` (which drops every schema of the target first), restores in a single
transaction without the original owners and privileges, then prints the number of rows of every table.

Disaster recovery into the production database:

```sh
docker compose ... stop adminspace                       # no writes during the restore
scripts/restore.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod \
    --force /var/backups/adminspace/adminspace_20261023T023000Z.dump
docker compose ... up -d --wait adminspace               # applies migrations newer than the dump
curl -s https://admin.example.com/readyz
```

Use the `APP_SECRET` that was in use when the dump was taken.

### Restore drill (monthly)

Restore the newest dump into a scratch database next to production, compare row counts, drop it:

```sh
latest=$(ls -1 /var/backups/adminspace/adminspace_*.dump | tail -n 1)
scripts/restore.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod \
    --dbname restore_drill --create "$latest"
docker compose ... exec postgres psql -U adminspace -d adminspace -c "select count(*) from accounts"   # compare
docker compose ... exec postgres dropdb -U adminspace restore_drill
```

Record the date, the dump used, the duration and the outcome. The same round trip (migrate, fill, dump,
prune, restore into empty and non-empty databases, `--force`, `--create`, checksum mismatch) is automated
in `tests/db/backup-restore.test.ts`, which CI runs on every change.

## Incident playbooks

### WorkAdventure cannot reach Adminspace

Symptoms: players see an error screen when entering rooms; play's log shows
`Could not reach Admin API server at http://adminspace:3000, will retry`, or Admin API errors.

1. `docker compose ... ps`: is adminspace `healthy`? If not, `logs --tail 100 adminspace`.
2. `curl -s https://admin.example.com/readyz`: `503` means the database is down ([next playbook](#database-down)).
3. Network: `docker network inspect workadventure-admin -f '{{range .Containers}}{{.Name}} {{end}}'` must list
   adminspace, play and back. Then
   `docker run --rm --network workadventure-admin busybox wget -qO- http://adminspace:3000/api/capabilities`.
4. Tokens: `403` lines with `route` `/api/[...path]` in Adminspace's log mean `ADMIN_API_TOKEN` differs.
   Compare the values (`docker compose ... exec adminspace printenv ADMIN_API_TOKEN | sha256sum` on both
   sides, to avoid printing them).
5. `429` lines: raise `RATE_LIMIT_ADMIN_API_PER_MINUTE`, `up -d adminspace`.
6. After fixing, restart play and back if Adminspace's capabilities changed.

### Database down

Symptoms: `/readyz` `503`, back-office pages and Admin API calls `500`, `unhandled error` lines with
database messages.

1. `docker compose ... ps postgres` and `docker compose ... logs --tail 200 postgres`.
2. Disk full (`df -h /var/lib/docker`)? Free space (old dumps, logs, `docker system df`), then
   `docker compose ... up -d postgres`.
3. Stopped or crashed: `docker compose ... up -d postgres`. Adminspace reconnects by itself: no restart
   needed (verified).
4. Corrupted data directory (PostgreSQL refuses to start): keep a copy of the volume
   (`docker run --rm -v adminspace_postgres-data:/data -v /root:/backup busybox tar -czf /backup/pgdata.tgz /data`),
   then restore the last dump into a new volume ([Restoring](#restoring)).

### Token rotation

Planned or after a leak of `ADMIN_API_TOKEN` or `ADMIN_SOCKETS_TOKEN`: follow DEPLOYMENT.md
([Secrets, rotation](DEPLOYMENT.md#secrets)). Both sides must change together; expect `403` on the Admin
API between the two restarts. After a leak, also check the audit log and the Admin API log lines for
calls from unexpected addresses (the Admin API is not reachable through the public proxy, so only hosts
on the private network or the host itself could use the token).

### Lost superadmin access

- **Another superadmin exists**: in **Platform › Accounts**, _Reset 2FA_ (lost device), _Reset password_
  (shows a temporary password, which must be changed at the next login) or _Unlock_ (too many failed
  attempts). Each reset ends the person's sessions and is audited.
- **No superadmin can log in** (break glass): create a new superadmin from the host. The command needs
  shell access to the host, which is the authentication:

    ```sh
    docker compose ... exec adminspace node build/cli/create-superadmin.js --email breakglass@example.com --name "Break glass"
    ```

    Log in with it, set up 2FA, repair the original account (reset 2FA or password), then _Disable_ the
    break-glass account. Every step is in the audit log (`account.create` by `cli:create-superadmin`).

- Locked out by the rate limit only: wait 15 minutes, or _Unlock_ from another account.

### Compromised account

1. **Platform › Accounts › Disable** the account: it can no longer log in and **all its sessions end** at
   once. (A superadmin cannot disable themselves, nor the last active superadmin: create a break-glass
   account first.)
2. Investigate in **Platform › Audit log** (and the organization audit logs): filter by the account,
   look for role changes, superadmin grants, Room API keys, domain changes, member exports, settings
   changes, and the source addresses.
3. Revert what was changed; revoke Room API keys the account created (**Organization › API keys**).
4. If the account was a superadmin or an organization admin (`secrets.read`), replace the integration
   secrets it could read: Jitsi, BigBlueButton, LiveKit, map-storage token, Room API keys.
5. Give access back: _Reset password_ (temporary password, sessions ended), _Reset 2FA_ so the owner
   sets up a new second factor on a clean device, then _Enable_.

Emergency SQL, if the back office is unavailable (ends every session of an account):

```sh
docker compose ... exec postgres psql -U adminspace -d adminspace \
    -c "delete from sessions where account_id = (select id from accounts where email = 'person@example.com')"
```

### Certificate problems

`docker compose ... logs proxy | grep -i -E 'error|challenge'`. Usual causes: DNS does not point to the
host, ports 80/443 blocked, Let's Encrypt rate limit after repeated failures (keep the `caddy-data`
volume; test with `TLS_MODE=internal`).

## Maintenance

| Task                                     | Frequency                    | How                                                                                                                                      |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Rebuild the image for base image patches | monthly                      | `docker compose ... build --pull adminspace && docker compose ... up -d --wait adminspace`                                               |
| PostgreSQL and Caddy minor updates       | monthly                      | `docker compose ... pull postgres proxy && docker compose ... up -d`. Minor PostgreSQL versions need no dump; majors do (DEPLOYMENT.md). |
| Dependency audit                         | every change (CI)            | `npm audit --omit=dev --audit-level=high`                                                                                                |
| Restore drill                            | monthly                      | [Restore drill](#restore-drill-monthly)                                                                                                  |
| Review accounts, superadmins, API keys   | quarterly                    | **Platform › Accounts**, organization teams, **API keys**                                                                                |
| Re-import the avatar catalog             | after WorkAdventure upgrades | DEPLOYMENT.md, step 5                                                                                                                    |
| Re-import the component pack             | after AdminSpace upgrades    | DEPLOYMENT.md, step 5b                                                                                                                   |
| Review failed jobs and emails            | weekly                       | **Control Center** overview                                                                                                              |
| Vacuum                                   | automatic                    | Autovacuum is on. After a large import or purge: `docker compose ... exec postgres vacuumdb -U adminspace -d adminspace --analyze`       |

Expired rate-limit counters and sessions are deleted by the application itself (rate limiter and
retention job): no cron job is needed for them.
