/**
 * Outgoing HTTP requests to URLs typed by people (Discord, Teams, Zapier, n8n and generic webhook endpoints): the
 * server must not become a probe of its own network (SSRF).
 *
 * - https only; plain http and private addresses only for hosts listed in INTEGRATION_ALLOWED_PRIVATE_HOSTS (a
 *   self-hosted n8n on the internal network, for example);
 * - no credentials in the URL, no redirects followed (a 3xx is an answer like any other);
 * - the address is checked when the socket connects (custom DNS lookup), not only when the URL is saved: a DNS name
 *   that later resolves to 127.0.0.1 or 169.254.169.254 (rebinding) is refused at that moment;
 * - bounded time and bounded answer size.
 */
import http from "node:http";
import https from "node:https";
import { lookup, type LookupAddress } from "node:dns";
import { lookup as lookupAsync } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";
import { isNonPublicAddress } from "../services/rooms";

export type OutgoingUrlProblem =
    "invalidUrl" | "insecureScheme" | "credentialsInUrl" | "privateAddress" | "unresolvable";

export class GuardedRequestError extends Error {
    override name = "GuardedRequestError";
    constructor(
        readonly code: OutgoingUrlProblem | "timeout" | "network",
        message: string,
    ) {
        super(message);
    }
}

export interface GuardedResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    /** The beginning of the answer (at most `maxBodyBytes`), for providers that answer details in the body. */
    body: string;
}

function hostOf(url: URL): string {
    return url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

/** Problems visible without DNS: scheme, credentials, literal private addresses. */
export function outgoingUrlProblem(
    raw: string,
    allowedPrivateHosts: readonly string[],
): OutgoingUrlProblem | undefined {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return "invalidUrl";
    }
    if (raw.length > 2048) return "invalidUrl";
    if (url.username || url.password) return "credentialsInUrl";
    const host = hostOf(url);
    const allowed = allowedPrivateHosts.includes(host);
    if (url.protocol === "http:") {
        if (!allowed) return "insecureScheme";
    } else if (url.protocol !== "https:") {
        return "insecureScheme";
    }
    if (!allowed && isIP(host) && isNonPublicAddress(host)) return "privateAddress";
    return undefined;
}

/** Full check before saving a URL: also resolves the name and refuses private addresses. */
export async function checkOutgoingUrl(
    raw: string,
    allowedPrivateHosts: readonly string[],
): Promise<OutgoingUrlProblem | undefined> {
    const problem = outgoingUrlProblem(raw, allowedPrivateHosts);
    if (problem) return problem;
    const host = hostOf(new URL(raw));
    if (allowedPrivateHosts.includes(host) || isIP(host)) return undefined;
    try {
        const addresses = await lookupAsync(host, { all: true });
        if (addresses.length === 0) return "unresolvable";
        return addresses.some((a) => isNonPublicAddress(a.address)) ? "privateAddress" : undefined;
    } catch {
        return "unresolvable";
    }
}

/** A DNS lookup that refuses non-public addresses, used by the socket itself (no rebinding window). */
function guardedLookup(allowed: boolean): LookupFunction {
    return (hostname, options, callback) => {
        lookup(hostname, { ...options, all: true }, (error, addresses) => {
            if (error) {
                callback(error, "", 0);
                return;
            }
            const list = addresses as unknown as LookupAddress[];
            if (list.length === 0 || (!allowed && list.some((a) => isNonPublicAddress(a.address)))) {
                callback(new GuardedRequestError("privateAddress", "the host resolves to a private address"), "", 0);
                return;
            }
            if (options.all) {
                (callback as unknown as (error: null, addresses: LookupAddress[]) => void)(null, list);
            } else {
                callback(null, list[0]!.address, list[0]!.family);
            }
        });
    };
}

export interface GuardedRequestInit {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    allowedPrivateHosts?: readonly string[];
    maxBodyBytes?: number;
}

/** Sends one request to a URL typed by a person, with the protections above. */
export function guardedRequest(raw: string, init: GuardedRequestInit): Promise<GuardedResponse> {
    const allowedPrivateHosts = init.allowedPrivateHosts ?? [];
    const problem = outgoingUrlProblem(raw, allowedPrivateHosts);
    if (problem) return Promise.reject(new GuardedRequestError(problem, `refused URL (${problem})`));
    const url = new URL(raw);
    const allowed = allowedPrivateHosts.includes(hostOf(url));
    const timeoutMs = init.timeoutMs ?? 10_000;
    const maxBodyBytes = init.maxBodyBytes ?? 16_384;
    const body = init.body === undefined ? undefined : Buffer.from(init.body, "utf8");
    const client = url.protocol === "https:" ? https : http;

    return new Promise<GuardedResponse>((resolve, reject) => {
        let settled = false;
        const finish = (outcome: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(deadline);
            outcome();
        };
        const request = client.request(url, {
            method: init.method,
            headers: {
                "user-agent": "AdminSpace-Integrations/1.0",
                ...(init.headers ?? {}),
                ...(body ? { "content-length": String(body.length) } : {}),
            },
            lookup: guardedLookup(allowed),
            // A fresh connection per request: a pooled socket validated for one name is never reused for another.
            agent: false,
        });
        const deadline = setTimeout(() => {
            request.destroy(new GuardedRequestError("timeout", `no answer within ${timeoutMs} ms`));
        }, timeoutMs);
        request.on("response", (response) => {
            const chunks: Buffer[] = [];
            let size = 0;
            const done = () =>
                finish(() =>
                    resolve({
                        status: response.statusCode ?? 0,
                        headers: response.headers,
                        body: Buffer.concat(chunks).toString("utf8"),
                    }),
                );
            response.on("data", (chunk: Buffer) => {
                if (size >= maxBodyBytes) return;
                const room = maxBodyBytes - size;
                chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
                size += Math.min(chunk.length, room);
                if (size >= maxBodyBytes) {
                    done();
                    response.destroy();
                }
            });
            response.on("end", done);
            response.on("error", done);
        });
        request.on("error", (error) =>
            finish(() =>
                reject(
                    error instanceof GuardedRequestError
                        ? error
                        : new GuardedRequestError(
                              "network",
                              `network error (${(error as NodeJS.ErrnoException).code ?? error.name})`,
                          ),
                ),
            ),
        );
        request.end(body);
    });
}

/** A response header as one string (first value of a repeated header). */
export function headerValue(headers: http.IncomingHttpHeaders, name: string): string | undefined {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
}
