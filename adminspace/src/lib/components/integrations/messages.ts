/**
 * Translation of the codes the Integration Center stores and returns (problems, delivery errors): pages never show
 * a provider's own message, only these codes in the person's language (unknown codes are shown as codes).
 */
import type { I18n } from "$lib/i18n/context";

export function problemText(i18n: I18n, code: string | null | undefined): string {
    if (!code) return "";
    const m = i18n.m.integrationCenter;
    const known = (m.problems as Record<string, string>)[code] ?? (m.targetProblems as Record<string, string>)[code];
    return known ?? i18n.t(m.problems.code, { code });
}

/** Delivery errors: "http_503" → "HTTP 503", known codes translated. */
export function deliveryErrorText(i18n: I18n, code: string | null | undefined): string {
    if (!code) return "";
    const http = /^http_(\d{3})$/.exec(code);
    if (http?.[1]) return i18n.t(i18n.m.integrationCenter.deliveries.httpStatus, { status: http[1] });
    return problemText(i18n, code);
}

/** "member.invited" → the label of the event. */
export function eventLabel(i18n: I18n, type: string): string {
    const key = type.replace(".", "_");
    return (i18n.m.integrationCenter.notifications.eventLabels as Record<string, string>)[key] ?? type;
}
