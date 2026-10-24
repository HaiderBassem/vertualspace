/** Validation of the room form, shared by rooms/new and rooms/[roomId]. */
import { z } from "zod";
import { checkbox, list, optionalText, optionalUrl, requiredText } from "$lib/server/http/forms";
import { ROOM_SLUG_PATTERN } from "$lib/server/workadventure/playUri";
import { TAG_NAME_PATTERN } from "$lib/server/services/tags";

const required = (path: string) => ({
    code: z.ZodIssueCode.too_small,
    minimum: 1,
    type: "string" as const,
    inclusive: true,
    path: [path],
});

export const RoomForm = z
    .object({
        name: requiredText(200),
        slug: z.string().trim().toLowerCase().min(1).max(128).regex(ROOM_SLUG_PATTERN),
        description: optionalText(2000),
        mapKind: z.enum(["wam", "tmj"]),
        wamUrl: optionalUrl,
        mapUrl: optionalUrl,
        thumbnailUrl: optionalUrl,
        requiredTags: list.pipe(z.array(z.string().regex(TAG_NAME_PATTERN))),
        isDefault: checkbox,
    })
    .superRefine((value, ctx) => {
        if (value.mapKind === "wam" && !value.wamUrl) ctx.addIssue(required("wamUrl"));
        if (value.mapKind === "tmj" && !value.mapUrl) ctx.addIssue(required("mapUrl"));
    });

export type RoomFormData = z.infer<typeof RoomForm>;
