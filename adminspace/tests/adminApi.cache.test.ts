/**
 * Regression: WorkAdventure's pusher caches GET answers of the Admin API (its global axios instance goes
 * through axios-cache-interceptor, set up by play/src/room-api/authentication/AdminAuthenticator.ts).
 * Found in the live test against WorkAdventure b579166: a person banned after being let in re-entered from
 * a new tab, because the pusher reused its cached /api/room/access answer and never asked again.
 * Every Admin API answer, successful or not, must therefore say Cache-Control: no-store.
 */
import { afterAll, describe, expect, it } from "vitest";
import { isBodyTooLarge, PayloadTooLargeError, readJson } from "../src/lib/server/adminApi/router";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { config } from "../src/lib/server/config";
import { closeDb } from "../src/lib/server/db/client";

afterAll(async () => {
    await closeDb();
});

async function call(path: string, token: string | undefined): Promise<Response> {
    const headers = new Headers();
    if (token !== undefined) headers.set("authorization", token);
    return dispatchAdminApi(new Request(`http://admin.test${path}`, { headers }), "198.51.100.20");
}

const ACCESS =
    "/api/room/access?playUri=http%3A%2F%2Fplay.test%2F%40%2Fnone%2Fnone%2Flobby&userIdentifier=x&ipAddress=203.0.113.1";

describe("Admin API answers are never cacheable", () => {
    it.each([
        ["capabilities (public)", "/api/capabilities", undefined, 200],
        ["room access with a valid token", ACCESS, "valid", 200],
        ["wrong token", "/api/map?playUri=http%3A%2F%2Fplay.test%2F", "wrong-token", 403],
        ["unknown endpoint", "/api/does-not-exist", "valid", 404],
    ])("%s", async (_label, path, token, status) => {
        const response = await call(path, token === "valid" ? config().ADMIN_API_TOKEN : token);
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
    });
});

/**
 * Regression: adapter-node raises a SvelteKitError(413) lazily while the body is read; readJson() used to
 * swallow it, so the Admin API answered 400 'Invalid body' instead of 413 for a body above BODY_SIZE_LIMIT.
 */
describe("a body above the platform's size limit answers 413", () => {
    function oversized(error: unknown): Request {
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.error(error);
            },
        });
        return new Request("http://admin.test/api/report", {
            method: "POST",
            headers: { authorization: config().ADMIN_API_TOKEN, "content-type": "application/json" },
            body,
            duplex: "half",
        } as RequestInit);
    }

    it("readJson() throws PayloadTooLargeError for adapter-node's 413, undefined for invalid JSON", async () => {
        const limitError = Object.assign(new Error("request body size exceeded BODY_SIZE_LIMIT of 2000000"), {
            status: 413,
            text: "Payload Too Large",
        });
        await expect(readJson(oversized(limitError))).rejects.toBeInstanceOf(PayloadTooLargeError);
        expect(isBodyTooLarge(new TypeError("wrapped", { cause: limitError }))).toBe(true);
        expect(isBodyTooLarge(new SyntaxError("Unexpected token"))).toBe(false);
        const invalid = new Request("http://admin.test/api/report", { method: "POST", body: "{not json" });
        expect(await readJson(invalid)).toBeUndefined();
    });

    it("the router answers 413, uncacheable", async () => {
        const limitError = Object.assign(new Error("Content-length of 3000000 exceeds limit of 2000000 bytes."), {
            status: 413,
        });
        const response = await dispatchAdminApi(oversized(limitError), "198.51.100.20");
        expect(response.status).toBe(413);
        expect(response.headers.get("cache-control")).toBe("no-store");
    });
});
