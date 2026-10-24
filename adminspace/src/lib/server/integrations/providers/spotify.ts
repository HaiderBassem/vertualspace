/**
 * Spotify (personal, strictly opt-in): "now playing" shown in the office only while the person enables sharing.
 * Authorization code flow with PKCE S256, scope user-read-currently-playing.
 *
 * Limits to know (docs/INTEGRATIONS.md): an app in development mode serves at most 5 people who must be added to its
 * allowlist, and its owner needs Spotify Premium; redirect URIs must be HTTPS (http://127.0.0.1:PORT is the only
 * exception, "localhost" is refused). Spotify has no revocation API: people remove the app in their account.
 */
import { z } from "zod";
import { config } from "../../config";
import { basicAuth, errorForStatus, getJson, providerFetch, parseJson, retryAfterSeconds } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type { ExternalIdentity, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, cleanText, clientCredentials } from "./shared";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
export const SPOTIFY_SCOPES = ["user-read-currently-playing"] as const;

function credentials() {
    return clientCredentials("Spotify", config().SPOTIFY_CLIENT_ID, config().SPOTIFY_CLIENT_SECRET);
}

const Me = z.object({ id: z.string().min(1).max(200), display_name: z.string().max(300).nullable().optional() });

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const me = await getJson(`${API}/me`, Me, "Spotify /me", { headers: bearer(accessToken) });
    return { id: me.id, name: me.display_name ?? me.id };
}

async function token(params: Record<string, string | undefined>, context: string): Promise<TokenSet> {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(TOKEN_URL, params, context, { basicAuth: basicAuth(id, secret) }),
        context,
    );
    return tokenSetFrom(answer, new Date(), SPOTIFY_SCOPES);
}

export const spotifyOAuth: OAuthAdapter = {
    pkce: true,
    authorizeUrl({ state, codeChallenge, redirectUri }) {
        return urlWithParams("https://accounts.spotify.com/authorize", {
            client_id: credentials().id,
            response_type: "code",
            redirect_uri: redirectUri,
            scope: SPOTIFY_SCOPES.join(" "),
            state,
            code_challenge_method: codeChallenge ? "S256" : undefined,
            code_challenge: codeChallenge,
        });
    },
    async exchangeCode({ code, codeVerifier, redirectUri }) {
        const tokens = await token(
            { grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier },
            "Spotify token",
        );
        return { tokens, identity: await identify(tokens.accessToken) };
    },
    /** Spotify may return a new refresh token: it then replaces the old one. */
    refresh: (refreshToken) =>
        token({ grant_type: "refresh_token", refresh_token: refreshToken }, "Spotify token refresh"),
    revoke: async () => "unsupported",
    test: (accessToken) => identify(accessToken),
};

const CurrentlyPlaying = z
    .object({
        is_playing: z.boolean().optional(),
        currently_playing_type: z.string().optional(),
        item: z
            .object({
                name: z.string().max(500),
                artists: z.array(z.object({ name: z.string().max(300) }).passthrough()).optional(),
                show: z
                    .object({ name: z.string().max(300) })
                    .passthrough()
                    .optional(),
            })
            .passthrough()
            .nullable()
            .optional(),
    })
    .passthrough();

export interface NowPlaying {
    title: string;
    artist: string;
}

/** Maps Spotify's answer: nothing while paused, no item (private session, ads) or nothing playing. */
export function mapNowPlaying(answer: z.infer<typeof CurrentlyPlaying>): NowPlaying | null {
    if (!answer.is_playing || !answer.item) return null;
    const title = cleanText(answer.item.name, 200);
    const artist = cleanText(answer.item.artists?.map((a) => a.name).join(", ") || answer.item.show?.name || "", 200);
    return title ? { title, artist: artist ?? "" } : null;
}

/** 204: nothing playing. */
export async function spotifyNowPlaying(accessToken: string): Promise<NowPlaying | null> {
    const response = await providerFetch(`${API}/me/player/currently-playing`, { headers: bearer(accessToken) });
    if (response.status === 204) return null;
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw errorForStatus(response.status, "Spotify currently-playing", {
            retryAfterSec: retryAfterSeconds(response.headers),
        });
    }
    return mapNowPlaying(await parseJson(response, CurrentlyPlaying, "Spotify currently-playing"));
}

export const spotify: ProviderDefinition = {
    id: "spotify",
    category: "music",
    capabilities: ["music"],
    personal: { method: "oauth", env: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"], scopes: SPOTIFY_SCOPES },
    oauth: spotifyOAuth,
    manageAccessUrl: "https://www.spotify.com/account/apps/",
    setupUrl: "https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow",
};
