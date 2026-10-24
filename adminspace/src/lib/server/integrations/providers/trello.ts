/**
 * Trello (organization), with Trello's own authorization flow: an API key (TRELLO_API_KEY) and a user token with
 * scope=read that expires after 30 days. Trello returns the token in the URL fragment of the return URL
 * (callback_method=fragment), which never reaches a server: the callback page reads it in the browser and posts it
 * once to AdminSpace with the single-use state, then removes it from the address bar. The token is sealed at rest and
 * sent to Trello in the Authorization header (never in a query string).
 *
 * Revocation: DELETE /1/tokens/{token}. Boards are read on demand to place them in rooms.
 */
import { z } from "zod";
import { config } from "../../config";
import { ProviderError, errorForStatus, getJson, providerFetch } from "../http";
import { urlWithParams } from "../oauth";
import type { ExternalIdentity, ExternalResource, ProviderDefinition } from "../types";
import { cleanText, httpUrlOrNull, isoOrNull } from "./shared";

const API = "https://api.trello.com/1";
export const TRELLO_TOKEN_DAYS = 30;
export const TRELLO_SCOPES = ["read"] as const;

function apiKey(): string {
    const key = config().TRELLO_API_KEY;
    if (!key) throw new ProviderError("notConfigured", "Trello is not configured on this server");
    return key;
}

/** Trello user tokens: 64 hexadecimal characters, or the newer "ATTA…" form. */
export function isTrelloToken(value: string): boolean {
    return /^[A-Za-z0-9]{32,256}$/.test(value);
}

function trelloHeaders(token: string): Record<string, string> {
    return {
        authorization: `OAuth oauth_consumer_key="${apiKey()}", oauth_token="${token}"`,
        accept: "application/json",
    };
}

/** Trello's authorization page; the token comes back in the fragment of {redirectUri}?state=…. */
export function trelloAuthorizeUrl(input: { state: string; redirectUri: string; appName: string }): string {
    return urlWithParams("https://trello.com/1/authorize", {
        expiration: `${TRELLO_TOKEN_DAYS}days`,
        name: input.appName,
        scope: TRELLO_SCOPES.join(","),
        response_type: "token",
        key: apiKey(),
        callback_method: "fragment",
        return_url: urlWithParams(input.redirectUri, { state: input.state }),
    });
}

const Member = z.object({
    id: z.string().min(1).max(100),
    username: z.string().max(200),
    fullName: z.string().max(300).optional(),
});
const TokenInfo = z
    .object({ dateExpires: z.string().nullable().optional(), idMember: z.string().max(100).optional() })
    .passthrough();

export async function trelloIdentify(token: string): Promise<ExternalIdentity> {
    const member = await getJson(`${API}/members/me?fields=username,fullName`, Member, "Trello member", {
        headers: trelloHeaders(token),
    });
    return { id: member.id, name: member.username };
}

/** When the token expires (Trello says; 30 days after authorization). */
export async function trelloTokenExpiry(token: string): Promise<Date | undefined> {
    const info = await getJson(
        `${API}/tokens/${encodeURIComponent(token)}?fields=dateExpires,idMember`,
        TokenInfo,
        "Trello token",
        {
            headers: trelloHeaders(token),
        },
    );
    const expires = isoOrNull(info.dateExpires);
    return expires ? new Date(expires) : undefined;
}

export async function revokeTrelloToken(token: string): Promise<"revoked"> {
    const response = await providerFetch(`${API}/tokens/${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: trelloHeaders(token),
    });
    await response.body?.cancel().catch(() => undefined);
    // 401: the token is already invalid.
    if (response.ok || response.status === 401 || response.status === 404) return "revoked";
    throw errorForStatus(response.status, "Trello revoke");
}

const Boards = z
    .array(
        z
            .object({
                id: z.string().min(1).max(100),
                name: z.string().max(500),
                url: z.string().max(2048).optional(),
                shortUrl: z.string().max(2048).optional(),
                dateLastActivity: z.string().nullable().optional(),
            })
            .passthrough(),
    )
    .max(500);

export async function listTrelloBoards(token: string, untitled: string): Promise<ExternalResource[]> {
    const boards = await getJson(
        `${API}/members/me/boards?filter=open&fields=name,url,shortUrl,dateLastActivity`,
        Boards,
        "Trello boards",
        { headers: trelloHeaders(token) },
    );
    return boards.slice(0, 50).flatMap((board) => {
        const url = httpUrlOrNull(board.shortUrl) ?? httpUrlOrNull(board.url);
        if (!url) return [];
        return [
            {
                id: board.id,
                title: cleanText(board.name, 200) ?? untitled,
                url,
                embedUrl: null,
                updatedAt: isoOrNull(board.dateLastActivity),
            },
        ];
    });
}

export const trello: ProviderDefinition = {
    id: "trello",
    category: "productivity",
    capabilities: ["resources"],
    organization: { method: "trelloToken", env: ["TRELLO_API_KEY"], scopes: TRELLO_SCOPES },
    setupUrl: "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
};
