# Running Adminspace with WorkAdventure's docker compose

`docker-compose.workadventure.yaml` is a compose **override** for WorkAdventure's development stack
(`docker-compose.yaml` of the WorkAdventure repository). It does not modify the WorkAdventure checkout.

It adds:

| Service         | Role                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `adminspace`    | This admin, built from `../adminspace`, served by Traefik at `http://admin.workadventure.localhost` |
| `adminspace-db` | PostgreSQL 17 for the admin (volume `adminspace-db`)                                                |

and changes:

| Service         | Change                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `play`          | `ADMIN_API_URL=http://adminspace:3000`, `ADMIN_URL`, `ADMIN_SOCKETS_TOKEN`, `OPID_PROFILE_SCREEN_PROVIDER`. WorkAdventure's compose file only forwards `ADMIN_API_URL` and `ADMIN_API_TOKEN`. |
| `back`          | `ADMIN_API_URL=http://adminspace:3000`                                                                                                                                                        |
| `reverse-proxy` | network alias `admin.workadventure.localhost`, so that containers (play) resolve the admin's public name                                                                                      |

## Usage

1. In WorkAdventure's `.env`, set (generate secrets with `openssl rand -hex 32`):

    ```dotenv
    ADMIN_API_TOKEN=<long random string>
    ADMIN_SOCKETS_TOKEN=<long random string>
    ADMINSPACE_APP_SECRET=<at least 32 random characters>
    ```

    `ADMIN_API_URL` in `.env` can stay empty: the override sets it.

2. From the WorkAdventure checkout:

    ```sh
    docker compose -f docker-compose.yaml -f ../adminspace/integration/docker-compose.workadventure.yaml up -d
    ```

    The admin applies its database migrations when it starts.

3. Import WorkAdventure's avatar catalog into the admin (from the Adminspace checkout, with `DATABASE_URL`
   pointing at `adminspace-db`, or by exposing its port), or add textures in **Platform › Avatar catalog**:

    ```sh
    npm run db:seed
    ```

    Until the catalog has textures, WorkAdventure sends every player back to the Woka selection screen.

4. Open `http://admin.workadventure.localhost/setup`, create the first superadmin, then an organization,
   a world and a room. The room opens at `http://play.workadventure.localhost/@/<organization>/<world>/<room>`.

## Checks

- `docker compose -f docker-compose.yaml -f ../adminspace/integration/docker-compose.workadventure.yaml config`
  shows the merged configuration. `reverse-proxy` must list `admin.workadventure.localhost` among its
  aliases: Compose appends list values of overrides, so the WorkAdventure aliases stay.
- The play logs must show `Remote admin api connection successful at http://adminspace:3000` followed by
  the capabilities. `Could not reach Admin API server` means the admin is not up yet or crashed:
  `docker compose logs adminspace`.
- On your machine, `*.localhost` names resolve to 127.0.0.1 in most browsers. If
  `admin.workadventure.localhost` does not, add it to `/etc/hosts`.

See [docs/INTEGRATION.md](../docs/INTEGRATION.md) for running the admin outside of Docker and for
troubleshooting.
