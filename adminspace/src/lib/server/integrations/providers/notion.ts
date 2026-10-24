/**
 * Notion (organization). A public integration (NOTION_CLIENT_ID/SECRET): the person installing it chooses which pages
 * AdminSpace may see (owner=user). AdminSpace lists those pages so administrators can place them in rooms (a
 * WorkAdventure "open a website" object). Every call sends Notion-Version.
 *
 * Token requests use HTTP Basic authentication with JSON bodies. Integrations created with expiring tokens also get a
 * refresh token. There is no revocation call: disconnecting deletes the token here and the workspace removes the
 * integration in Notion (Settings › Connections).
 */
import { z } from "zod";
import { config } from "../../config";
import { basicAuth, getJson } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type { ExternalIdentity, ExternalResource, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, cleanText, clientCredentials, httpUrlOrNull, isoOrNull } from "./shared";

const API = "https://api.notion.com/v1";
export const NOTION_VERSION = "2026-03-11";

function credentials() {
    return clientCredentials("Notion", config().NOTION_CLIENT_ID, config().NOTION_CLIENT_SECRET);
}

function notionHeaders(token: string): Record<string, string> {
    return { ...bearer(token), "notion-version": NOTION_VERSION };
}

const BotUser = z
    .object({
        id: z.string().min(1).max(100),
        bot: z
            .object({ workspace_name: z.string().max(200).nullable().optional() })
            .passthrough()
            .optional(),
    })
    .passthrough();

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const user = await getJson(`${API}/users/me`, BotUser, "Notion /users/me", { headers: notionHeaders(accessToken) });
    return { id: user.id, name: user.bot?.workspace_name ?? "Notion" };
}

const TokenExtras = z
    .object({ workspace_id: z.string().max(100).optional(), workspace_name: z.string().max(200).nullable().optional() })
    .passthrough();

async function tokens(params: Record<string, string | undefined>, context: string) {
    const { id, secret } = credentials();
    const answer = await tokenRequest(`${API}/oauth/token`, params, context, {
        json: true,
        basicAuth: basicAuth(id, secret),
        headers: { "notion-version": NOTION_VERSION },
    });
    return { token: parseTokenAnswer(answer, context), extras: TokenExtras.safeParse(answer) };
}

export const notionOAuth: OAuthAdapter = {
    pkce: false,
    authorizeUrl({ state, redirectUri }) {
        return urlWithParams(`${API}/oauth/authorize`, {
            client_id: credentials().id,
            response_type: "code",
            owner: "user",
            redirect_uri: redirectUri,
            state,
        });
    },
    async exchangeCode({ code, redirectUri }) {
        const { token, extras } = await tokens(
            { grant_type: "authorization_code", code, redirect_uri: redirectUri },
            "Notion token",
        );
        const set = tokenSetFrom(token);
        const identity = await identify(set.accessToken);
        const workspace = extras.success ? extras.data : undefined;
        return {
            tokens: set,
            identity: {
                id: workspace?.workspace_id ?? identity.id,
                name: workspace?.workspace_name ?? identity.name,
            },
        };
    },
    async refresh(refreshToken): Promise<TokenSet> {
        const { token } = await tokens(
            { grant_type: "refresh_token", refresh_token: refreshToken },
            "Notion token refresh",
        );
        return tokenSetFrom(token);
    },
    revoke: async () => "unsupported",
    test: (accessToken) => identify(accessToken),
};

const RichText = z.object({ plain_text: z.string() }).passthrough();
const Page = z
    .object({
        object: z.string(),
        id: z.string().min(1).max(100),
        url: z.string().max(2048).optional(),
        last_edited_time: z.string().optional(),
        properties: z
            .record(z.object({ type: z.string(), title: z.array(RichText).optional() }).passthrough())
            .optional(),
    })
    .passthrough();
const SearchAnswer = z.object({ results: z.array(Page).max(200) }).passthrough();

/** The title of a page: its "title" property (whatever its name). */
export function notionTitle(page: z.infer<typeof Page>): string | null {
    for (const property of Object.values(page.properties ?? {})) {
        if (property.type === "title" && property.title)
            return cleanText(property.title.map((t) => t.plain_text).join(""), 200);
    }
    return null;
}

/** The pages shared with the integration, most recently edited first. */
export async function listNotionPages(accessToken: string, untitled: string): Promise<ExternalResource[]> {
    const answer = await getJson(`${API}/search`, SearchAnswer, "Notion search", {
        method: "POST",
        headers: { ...notionHeaders(accessToken), "content-type": "application/json" },
        body: JSON.stringify({
            filter: { property: "object", value: "page" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
            page_size: 25,
        }),
    });
    return answer.results.flatMap((page) => {
        const url = httpUrlOrNull(page.url);
        if (page.object !== "page" || !url) return [];
        return [
            {
                id: page.id,
                title: notionTitle(page) ?? untitled,
                url,
                embedUrl: null,
                updatedAt: isoOrNull(page.last_edited_time),
            },
        ];
    });
}

export const notion: ProviderDefinition = {
    id: "notion",
    category: "productivity",
    capabilities: ["resources"],
    organization: { method: "oauth", env: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"], scopes: [] },
    oauth: notionOAuth,
    setupUrl: "https://developers.notion.com/docs/authorization",
};
