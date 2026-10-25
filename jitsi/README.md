# Jitsi Meet for WorkAdventure

Video meetings opened from the "Jitsi" areas of the maps. Four containers of the official
[docker-jitsi-meet](https://github.com/jitsi/docker-jitsi-meet) images (`web`, `prosody`, `jicofo`, `jvb`), published
through the Traefik of the server.

**Only WorkAdventure gets in.** Jitsi uses JWT authentication and no guests: the back of WorkAdventure signs a token for
each person who opens a meeting (`back/src/Services/SocketManager.ts`, `handleQueryJitsiJwtMessage`), moderator rights
for people holding the `admin` tag. Without a token, or with one signed with another secret, Jitsi refuses.

## Set up

```sh
cp .env.example .env      # then replace every <...> (openssl rand -hex 24 for the passwords and the JWT secret)
mkdir -p config/{web,storage/web,prosody/config,prosody/prosody-plugins-custom,storage/prosody,jicofo,jvb}
docker compose up -d
```

and in WorkAdventure's `contrib/docker/.env.prod` (the compose file passes them to `play` and `back`):

```
JITSI_URL=<the same address as JITSI_DOMAIN>
JITSI_PRIVATE_MODE=true
JITSI_ISS=workadventure             # = JWT_APP_ID here
SECRET_JITSI_KEY=<JWT_APP_SECRET>   # the same secret on both sides
```

then restart `play` and `back`. A world can also bring its own Jitsi in its settings (third party); the variables above
are what every other world uses.

## Address

`JITSI_DOMAIN` must resolve to this server. `jitsi.<ip with dashes>.sslip.io` does so with no DNS work (Traefik gets its
certificate by itself). To use your own name: add an A record to the server (not proxied), then change `JITSI_DOMAIN`,
`PUBLIC_URL`, the five `XMPP_*_DOMAIN` values and `TURN_HOST` in `.env`, `JITSI_URL` in WorkAdventure's `.env.prod`, and
`docker compose up -d --force-recreate` + restart `play` and `back`. `XMPP_DOMAIN` has to be the address of Jitsi: the
`sub` claim of the tokens is `JITSI_URL`.

## Ports

| Port       | Why                                                                       | Where            |
| ---------- | ------------------------------------------------------------------------- | ---------------- |
| 443        | web, signalling (websockets): through Traefik                             | already open     |
| 10000/udp  | media to the video bridge (`JVB_PORT`)                                    | `ufw allow` done |
| 4443/tcp   | media over TCP for networks that block UDP (`JVB_TCP_PORT`)               | `ufw allow` done |
| 3478/udp   | the TURN server of WorkAdventure (coturn), offered to clients as a relay  | already open     |

The bridge advertises `JVB_ADVERTISE_IPS` (the public address of the server) to browsers. If media does not flow for
people outside, check that the cloud provider's firewall, if there is one, lets these ports through too.

## Testing

`test/embed.mjs` joins two players the way the game embeds Jitsi and checks that audio and video flow both ways, using
Playwright's Chromium with fake cameras. From this directory:

```sh
JWT=$(grep '^JWT_APP_SECRET=' .env | cut -d= -f2)
docker run --rm --network jitsi_meet.jitsi -e JITSI_DOMAIN=<JITSI_DOMAIN> -e JWT_SECRET=$JWT \
    -v $PWD/test:/e2e -w /e2e mcr.microsoft.com/playwright:v1.52.0-noble \
    sh -c 'npm i playwright-core@1.52.0 jose >/dev/null 2>&1 && node embed.mjs'
```

It runs on the server, so it proves the stack and the tokens, not the reachability of the ports from the Internet.

## Notes

- The `stable` images need a writable filesystem (the compose file of the project has no `read_only`).
- `config/` and `.env` hold the state and the secrets: git ignores them. Back them up with the rest of the server.
