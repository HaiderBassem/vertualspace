import { z } from "zod";

/**
 * A custom status ("🌴 On vacation until Monday"), shown on the nameplate. It travels as a public, persisted player
 * variable of the world, so it reaches everyone in the world without a dedicated message, and scripts can read it.
 */
export const CUSTOM_STATUS_VARIABLE = "wa:customStatus";

export const CUSTOM_STATUS_MAX_TEXT_LENGTH = 80;

export const CustomStatus = z.object({
    emoji: z.string().max(16),
    text: z.string().max(CUSTOM_STATUS_MAX_TEXT_LENGTH),
    /** When the status clears itself (milliseconds since the epoch), if it does. */
    expiresAt: z.number().int().positive().optional(),
});
export type CustomStatus = z.infer<typeof CustomStatus>;

export const CustomStatusDuration = z.enum(["never", "30m", "1h", "4h", "today", "week"]);
export type CustomStatusDuration = z.infer<typeof CustomStatusDuration>;

/** The status in a variable value, or undefined when there is none, it is invalid, empty or expired. */
export function parseCustomStatus(value: unknown, now = Date.now()): CustomStatus | undefined {
    const result = CustomStatus.safeParse(value);
    if (!result.success) {
        return undefined;
    }
    const status = result.data;
    if (status.emoji.trim() === "" && status.text.trim() === "") {
        return undefined;
    }
    if (status.expiresAt !== undefined && status.expiresAt <= now) {
        return undefined;
    }
    return status;
}

/** When a status set now with this duration clears itself ("today" and "week" end at local midnight). */
export function customStatusExpiry(duration: CustomStatusDuration, now = new Date()): number | undefined {
    switch (duration) {
        case "never":
            return undefined;
        case "30m":
            return now.getTime() + 30 * 60_000;
        case "1h":
            return now.getTime() + 60 * 60_000;
        case "4h":
            return now.getTime() + 4 * 60 * 60_000;
        case "today": {
            const end = new Date(now);
            end.setHours(24, 0, 0, 0);
            return end.getTime();
        }
        case "week": {
            // The start of next Monday (end of Sunday).
            const end = new Date(now);
            end.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() + ((8 - now.getDay()) % 7 || 7));
            return end.getTime();
        }
    }
}

/** The status as one line, e.g. "🌴 On vacation". */
export function formatCustomStatus(status: CustomStatus): string {
    return `${status.emoji} ${status.text}`.trim();
}
