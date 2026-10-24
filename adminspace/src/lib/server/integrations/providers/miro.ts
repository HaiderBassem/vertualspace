/**
 * Miro (organization). OAuth 2.0 (MIRO_CLIENT_ID/SECRET), scope boards:read. Token requests carry their parameters in
 * the query string; apps with expiring tokens get one-hour access tokens and rotating 60-day refresh tokens. Miro
 * retired its webhooks: boards are read on demand. Each board has a live embed URL that administrators can place in a
 * room (a WorkAdventure "open a website" object): https://miro.com/app/live-embed/{board_id}/.
 */
import { z } from "zod";
import { config } from "../../config";
import { getJson } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type { ExternalIdentity, ExternalResource, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, cleanText, clientCredentials, httpUrlOrNull, isoOrNull } from "./shared";

const AUTHORIZE_URL = "https://miro.com/oauth/authorize";
const TOKEN_URL = "https://api.miro.com/v1/oauth/token";
export const MIRO_SCOPES = ["boards:read"] as const;

function credentials() {
    return clientCredentials("Miro", config().MIRO_CLIENT_ID, config().MIRO_CLIENT_SECRET);
}

const TokenContext = z
    .object({
        team: z.object({ id: z.string().max(100), name: z.string().max(200).optional() }).passthrough(),
    })
    .passthrough();

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const context = await getJson("https://api.miro.com/v1/oauth-token", TokenContext, "Miro token context", {
        headers: bearer(accessToken),
    });
    return { id: context.team.id, name: context.team.name ?? context.team.id };
}

export const miroOAuth: OAuthAdapter = {
    pkce: false,
    authorizeUrl({ state, redirectUri }) {
        return urlWithParams(AUTHORIZE_URL, {
            response_type: "code",
            client_id: credentials().id,
            redirect_uri: redirectUri,
            state,
        });
    },
    async exchangeCode({ code, redirectUri }) {
        const { id, secret } = credentials();
        const answer = parseTokenAnswer(
            await tokenRequest(
                TOKEN_URL,
                {
                    grant_type: "authorization_code",
                    client_id: id,
                    client_secret: secret,
                    code,
                    redirect_uri: redirectUri,
                },
                "Miro token",
                { query: true },
            ),
            "Miro token",
        );
        const tokens = tokenSetFrom(answer, new Date(), MIRO_SCOPES);
        return { tokens, identity: await identify(tokens.accessToken) };
    },
    async refresh(refreshToken): Promise<TokenSet> {
        const { id, secret } = credentials();
        const answer = parseTokenAnswer(
            await tokenRequest(
                TOKEN_URL,
                { grant_type: "refresh_token", client_id: id, client_secret: secret, refresh_token: refreshToken },
                "Miro token refresh",
                { query: true },
            ),
            "Miro token refresh",
        );
        return tokenSetFrom(answer, new Date(), MIRO_SCOPES);
    },
    revoke: async () => "unsupported",
    test: (accessToken) => identify(accessToken),
};

export function miroEmbedUrl(boardId: string): string {
    return `https://miro.com/app/live-embed/${encodeURIComponent(boardId)}/`;
}

const Boards = z
    .object({
        data: z
            .array(
                z
                    .object({
                        id: z.string().min(1).max(100),
                        name: z.string().max(500).optional(),
                        viewLink: z.string().max(2048).optional(),
                        modifiedAt: z.string().optional(),
                    })
                    .passthrough(),
            )
            .max(200),
    })
    .passthrough();

export async function listMiroBoards(accessToken: string, untitled: string): Promise<ExternalResource[]> {
    const answer = await getJson(
        urlWithParams("https://api.miro.com/v2/boards", { limit: "50", sort: "last_modified" }),
        Boards,
        "Miro boards",
        { headers: bearer(accessToken) },
    );
    return answer.data.map((board) => ({
        id: board.id,
        title: cleanText(board.name, 200) ?? untitled,
        url: httpUrlOrNull(board.viewLink) ?? `https://miro.com/app/board/${encodeURIComponent(board.id)}/`,
        embedUrl: miroEmbedUrl(board.id),
        updatedAt: isoOrNull(board.modifiedAt),
    }));
}

export const miro: ProviderDefinition = {
    id: "miro",
    category: "productivity",
    capabilities: ["resources"],
    organization: { method: "oauth", env: ["MIRO_CLIENT_ID", "MIRO_CLIENT_SECRET"], scopes: MIRO_SCOPES },
    oauth: miroOAuth,
    setupUrl: "https://developers.miro.com/docs/getting-started-with-oauth",
};
