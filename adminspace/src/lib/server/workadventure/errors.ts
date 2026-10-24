/**
 * Builders for WorkAdventure's ErrorApiData bodies (contract: libs/messages JsonMessages/ErrorApiData).
 * Codes are SCREAMING_SNAKE_CASE as the contract requires; texts are localized with the
 * Accept-Language header WorkAdventure forwards from the player's browser.
 */
import type {
    ErrorApiErrorData,
    ErrorApiRedirectData,
    ErrorApiRetryData,
    ErrorApiUnauthorizedData,
} from "../../contract/workadventure";
import { format, messagesFor, negotiateLocale, type Locale } from "../../i18n";

export type WorkAdventureErrorKey =
    | "roomNotFound"
    | "worldNotFound"
    | "worldArchived"
    | "worldExpired"
    | "invalidUrl"
    | "banNotAllowed"
    | "organizationSuspended"
    | "roomPreparing";

const CODES: Record<WorkAdventureErrorKey, string> = {
    roomNotFound: "ROOM_NOT_FOUND",
    worldNotFound: "WORLD_NOT_FOUND",
    worldArchived: "WORLD_ARCHIVED",
    worldExpired: "WORLD_EXPIRED",
    invalidUrl: "UNSUPPORTED_URL_FORMAT",
    banNotAllowed: "BAN_NOT_ALLOWED",
    organizationSuspended: "ORGANIZATION_SUSPENDED",
    roomPreparing: "ROOM_NOT_READY",
};

export function localeFromRequest(request: Request): Locale {
    return negotiateLocale(request.headers.get("accept-language"));
}

export function errorData(key: WorkAdventureErrorKey, locale: Locale): ErrorApiErrorData {
    const m = messagesFor(locale).workadventure;
    return {
        status: "error",
        type: "error",
        code: CODES[key],
        title: m.errorTitle,
        subtitle: m[key].subtitle,
        details: m[key].details,
    };
}

export function bannedData(reason: string, locale: Locale): ErrorApiUnauthorizedData {
    const m = messagesFor(locale).workadventure;
    return {
        status: "error",
        type: "unauthorized",
        code: "USER_BANNED",
        title: m.errorTitle,
        subtitle: m.banned.subtitle,
        details: format(m.banned.details, { reason: reason || m.defaultBanReason }),
        buttonTitle: null,
    };
}

/** Access refused to someone who is not a member of the world, or lacks a tag the room requires. */
export function unauthorizedData(key: "membersOnly" | "tagRequired", locale: Locale): ErrorApiUnauthorizedData {
    const m = messagesFor(locale).workadventure;
    return {
        status: "error",
        type: "unauthorized",
        code: key === "membersOnly" ? "USER_ACCESS_FORBIDDEN" : "ROOM_ACCESS_FORBIDDEN",
        title: m.errorTitle,
        subtitle: m[key].subtitle,
        details: m[key].details,
        buttonTitle: m[key].button,
    };
}

export function worldFullData(locale: Locale): ErrorApiRetryData {
    const m = messagesFor(locale).workadventure.worldFull;
    return {
        status: "error",
        type: "retry",
        code: "WORLD_FULL",
        title: m.title,
        subtitle: m.subtitle,
        details: m.details,
        buttonTitle: m.button,
        timeToRetry: 30_000,
        canRetryManual: true,
    };
}

export function redirectData(urlToRedirect: string): ErrorApiRedirectData {
    return { status: "error", type: "redirect", urlToRedirect };
}
