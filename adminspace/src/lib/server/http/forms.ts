/**
 * Form handling for back-office actions. Validation errors are returned as codes (keys of
 * messages.common.errors), never as English text, so each locale renders its own wording.
 */
import { fail, type ActionFailure } from "@sveltejs/kit";
import { z } from "zod";
import type { Messages } from "../../i18n";

export type FormErrorCode = keyof Messages["common"]["errors"];

export interface FormFailure {
    errors: Record<string, FormErrorCode>;
    values: Record<string, string>;
    /** A form-level error, shown above the form. */
    message?: FormErrorCode;
}

/** All text values of a form (files ignored). Repeated names keep their last value. */
export function formValues(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") values[key] = value;
    }
    return values;
}

function codeFor(issue: z.ZodIssue): FormErrorCode {
    switch (issue.code) {
        case "invalid_string":
            if (issue.validation === "url") return "invalidUrl";
            if (issue.validation === "email") return "invalidEmail";
            return "validation";
        case "too_big":
            return "tooLong";
        case "too_small":
            return "requiredField";
        case "invalid_type":
            return issue.received === "undefined" ? "requiredField" : "validation";
        case "custom": {
            const code = (issue.params as { code?: FormErrorCode } | undefined)?.code;
            return code ?? "validation";
        }
        default:
            return "validation";
    }
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; failure: ActionFailure<FormFailure> };

/** Validates a form with a zod schema; on failure returns a ready-to-return 400 ActionFailure. */
export function parseForm<S extends z.ZodTypeAny>(formData: FormData, schema: S): ParseResult<z.infer<S>> {
    const values = formValues(formData);
    const result = schema.safeParse(values);
    if (result.success) return { ok: true, data: result.data };
    const errors: Record<string, FormErrorCode> = {};
    for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "_form");
        errors[field] ??= codeFor(issue);
    }
    return { ok: false, failure: fail(400, { errors, values, message: "validation" }) };
}

/** A failure on one field (e.g. "slugTaken" on "slug"), or a form-level one when no field is given. */
export function formError(
    values: Record<string, string>,
    code: FormErrorCode,
    field?: string,
): ActionFailure<FormFailure> {
    return fail(400, { errors: field ? { [field]: code } : {}, values, message: code });
}

/**
 * A same-site path to redirect to after an action; anything else becomes "/" (no open redirect).
 * Control characters and backslashes are refused outright (browsers strip or reinterpret them, e.g.
 * "/\t/evil.example" becomes "//evil.example"), then the value is re-parsed against a placeholder
 * origin and must stay on it.
 */
export function safeRedirectPath(value: unknown): string {
    if (typeof value !== "string" || value.length === 0 || value.length > 2048) return "/";
    // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused here
    if (/[\u0000-\u001f\u007f\\]/.test(value)) return "/";
    if (!value.startsWith("/") || value.startsWith("//")) return "/";
    try {
        const base = "http://redirect.invalid";
        const url = new URL(value, base);
        if (url.origin !== base) return "/";
        const path = url.pathname + url.search + url.hash;
        return path.startsWith("//") ? "/" : path;
    } catch {
        return "/";
    }
}

// Field schemas shared by forms ---------------------------------------------------------------

/** Trimmed text; "" becomes undefined. */
export const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((v) => (v ? v : undefined));

export const requiredText = (max: number) => z.string().trim().min(1).max(max);

/** HTML checkbox: present ("on") means true. */
export const checkbox = z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true");

/** Three-state select for optional booleans: "" (WorkAdventure default), "true", "false". */
export const optionalBoolean = z
    .enum(["", "true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined));

/**
 * True for an absolute http(s) URL. Every URL entered in the back office ends up in links, iframes or
 * fetches made by WorkAdventure clients, so other schemes (javascript:, data:, file:, ...) are refused.
 */
export function isHttpUrl(value: unknown): value is string {
    if (typeof value !== "string" || value.length > 2048) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

/** An http(s) URL, or undefined for any other value (to sanitize data read back from storage). */
export function httpUrlOrUndefined(value: unknown): string | undefined {
    return isHttpUrl(value) ? value : undefined;
}

/** Required http(s) URL. */
export const httpUrl = z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine(isHttpUrl, { params: { code: "invalidUrl" } });

/** Optional http(s) URL: "" becomes undefined. */
export const optionalUrl = z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(httpUrl.optional());

/** Alias making the http(s)-only restriction explicit at call sites. */
export const optionalHttpUrl = optionalUrl;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for a UUID (RFC 9562). Ids from URLs and forms are checked before reaching SQL (no 500 on garbage). */
export function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Largest page number accepted in paginated lists; larger values are clamped (no OFFSET overflow). */
export const MAX_PAGE = 10_000;

/** Parses a 1-based page number from a query string value, clamped to [1, MAX_PAGE]. */
export function pageParam(raw: string | null | undefined): number {
    const page = Number.parseInt(raw ?? "1", 10);
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.min(page, MAX_PAGE);
}

/** Comma or newline separated list. */
export const list = z
    .string()
    .optional()
    .transform((v) =>
        (v ?? "")
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
    );
