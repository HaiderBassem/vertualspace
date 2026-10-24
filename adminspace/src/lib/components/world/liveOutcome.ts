/** Wording of the outcome of a back-office ban: the ban is saved, and the immediate disconnection is reported as it went. */
import type { I18n } from "$lib/i18n/context";

export type LiveDisconnect = "sent" | "notConfigured" | "unreachable" | "rejected" | "notApplicable";

export function isLiveDisconnect(value: unknown): value is LiveDisconnect {
    return (
        value === "sent" ||
        value === "notConfigured" ||
        value === "unreachable" ||
        value === "rejected" ||
        value === "notApplicable"
    );
}

export function banSavedText(i18n: I18n, outcome: unknown): string {
    const m = i18n.m.moderation.liveDisconnect;
    return isLiveDisconnect(outcome) ? i18n.t(m.banSaved, { outcome: m.outcomes[outcome] }) : m.banSavedOnly;
}
