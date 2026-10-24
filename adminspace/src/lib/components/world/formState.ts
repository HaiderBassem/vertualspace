/**
 * Helpers to read SvelteKit action results (`form`) in world pages without fighting the union types
 * of ActionData. Results follow src/lib/server/http/forms.ts: { errors, values, message } on failure,
 * { success: true, op } on success.
 */
import type { Messages } from "$lib/i18n";

export type ErrorCode = keyof Messages["common"]["errors"];

type Loose = Record<string, unknown> | null | undefined;

function record(form: unknown): Loose {
    return form && typeof form === "object" ? (form as Record<string, unknown>) : undefined;
}

export function formErrors(form: unknown): Record<string, ErrorCode | undefined> {
    const errors = record(form)?.errors;
    return errors && typeof errors === "object" ? (errors as Record<string, ErrorCode>) : {};
}

export function formValuesOf(form: unknown): Record<string, string | undefined> {
    const values = record(form)?.values;
    return values && typeof values === "object" ? (values as Record<string, string>) : {};
}

/** Which form of the page the result belongs to (the `op` field of the action result). */
export function formOp(form: unknown): string | undefined {
    const op = record(form)?.op;
    return typeof op === "string" ? op : undefined;
}

export function formField<T>(form: unknown, key: string): T | undefined {
    return record(form)?.[key] as T | undefined;
}

/** The shape FormMessage expects. */
export function formFeedback(form: unknown): { message?: ErrorCode; success?: boolean } | undefined {
    const r = record(form);
    if (!r) return undefined;
    return { message: r.message as ErrorCode | undefined, success: r.success === true };
}
