/**
 * Request identifiers and structured (JSON lines) logs.
 *
 * Every request gets an id, taken from a safe incoming X-Request-Id (set by the reverse proxy) or
 * generated, and echoed in the response. Logs never contain query strings, bodies, cookies or SQL
 * parameters: only the path, the route, the status, the duration and who made the request.
 */
import { randomUUID } from "node:crypto";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

export function requestIdFrom(header: string | null): string {
    return header && SAFE_REQUEST_ID.test(header) ? header : randomUUID();
}

type LogLevel = "info" | "warn" | "error";

export function logJson(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
    const line = JSON.stringify({ time: new Date().toISOString(), level, msg: message, ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
}

/** A safe description of an error: its message and code, never its bound parameters or stack. */
export function describeError(error: unknown): { message: string; code?: string; name?: string } {
    if (error instanceof Error) {
        // Drizzle wraps database errors as "Failed query: <sql>\nparams: <values>" with the database error as
        // its cause: log the cause (message and SQLSTATE), never the bound values (personal data, hashes).
        const source = error.cause instanceof Error ? error.cause : error;
        const code = (source as { code?: unknown }).code;
        const message = source.message.split(/\bparams:/)[0] ?? "";
        return {
            name: source.name,
            message: message.trim().slice(0, 500),
            ...(typeof code === "string" ? { code } : {}),
        };
    }
    return { message: String(error).slice(0, 500) };
}
