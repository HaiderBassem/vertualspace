import { error, fail, redirect } from "@sveltejs/kit";
import { isIP } from "node:net";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { formValues, list, optionalText, optionalUrl, parseForm, requiredText } from "$lib/server/http/forms";
import { banFromBackOffice } from "$lib/server/services/banAdmin";
import {
    bansOfMember,
    editMember,
    eraseMember,
    getMember,
    reportsAboutMember,
    tagPolicyFor,
} from "$lib/server/services/memberAdmin";
import { worldTagNames } from "$lib/server/services/members";
import {
    managerSuggestions,
    organizationDepartments,
    organizationWorkLocations,
    reportingLines,
    saveMemberProfile,
} from "$lib/server/services/memberProfiles";
import { normalizeProfileInput, PROFILE_TEXT_MAX } from "$lib/profiles/model";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world, access } = await loadWorld(locals, params.org, params.world, "member.read");
    const member = await getMember(world.id, params.memberId);
    if (!member) error(404, "Not found");
    const canManage = access.can("member.manage");
    const organizationId = access.organization.id;
    const [bans, reports, tagNames, lines, suggestions] = await Promise.all([
        bansOfMember(world.id, member),
        reportsAboutMember(world.id, member),
        worldTagNames(world.id),
        member.email ? reportingLines(organizationId, world.id, member.email) : null,
        canManage && member.email
            ? Promise.all([
                  organizationDepartments(organizationId),
                  organizationWorkLocations(organizationId),
                  managerSuggestions(world.id),
              ])
            : null,
    ]);
    const now = new Date();
    return {
        member: {
            id: member.id,
            uuid: member.uuid,
            kind: member.kind,
            email: member.email,
            name: member.name,
            visitCardUrl: member.visitCardUrl,
            chatId: member.chatId,
            locale: member.locale,
            tags: member.tags,
            visitCount: member.visitCount,
            lastSeenAt: member.lastSeenAt,
            createdAt: member.createdAt,
        },
        bans: bans.map((b) => ({
            id: b.id,
            reason: b.reason,
            ipAddress: b.ipAddress,
            createdAt: b.createdAt,
            expiresAt: b.expiresAt,
            status: b.revokedAt ? "revoked" : b.expiresAt && b.expiresAt <= now ? "expired" : "active",
        })),
        reports: reports.map((r) => ({ id: r.id, comment: r.comment, status: r.status, createdAt: r.createdAt })),
        tagNames,
        /** Employee profile and reporting lines; null for people without an email (anonymous guests). */
        profile: lines,
        profileSuggestions: suggestions
            ? {
                  departments: suggestions[0],
                  workLocations: suggestions[1],
                  managers: suggestions[2].filter((email) => email !== member.email?.toLowerCase()),
              }
            : null,
    };
};

const EditForm = z.object({
    name: optionalText(200),
    email: z
        .string()
        .trim()
        .max(320)
        .optional()
        .transform((v) => (v ? v : undefined))
        .pipe(z.string().email().optional()),
    visitCardUrl: optionalUrl,
    kind: z.enum(["member", "guest"]),
    tags: list,
});

const optionalEmail = z
    .string()
    .trim()
    .max(320)
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().email().optional());

const ProfileForm = z.object({
    jobTitle: optionalText(PROFILE_TEXT_MAX),
    department: optionalText(PROFILE_TEXT_MAX),
    workLocation: optionalText(PROFILE_TEXT_MAX),
    managerEmail: optionalEmail,
});

const BanForm = z.object({
    reason: requiredText(1000),
    ipAddress: optionalText(45),
    duration: z.enum(["permanent", "hour", "day", "week", "month"]),
});

export const actions: Actions = {
    save: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
        const formData = await request.formData();
        const parsed = parseForm(formData, EditForm);
        if (!parsed.ok) return parsed.failure;
        const policy = await tagPolicyFor(world, access.can("tag.manage"));
        const result = await editMember(world.id, params.memberId, parsed.data, policy);
        if (result === "notFound") error(404, "Not found");
        if (result === "invalidTag" || result === "reservedTag" || result === "unknownTag") {
            return fail(400, { op: "save", tagError: result, values: formValues(formData) });
        }
        if (result === "emailTaken") {
            return fail(400, {
                op: "save",
                emailTaken: true,
                errors: { email: "validation" as const },
                values: formValues(formData),
            });
        }
        await audit({
            action: "member.update",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "member",
            targetId: params.memberId,
            ipAddress: locals.clientIp ?? null,
            details: { kind: parsed.data.kind, tags: parsed.data.tags },
        });
        return { success: true, op: "save" };
    },

    profile: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
        const formData = await request.formData();
        const parsed = parseForm(formData, ProfileForm);
        if (!parsed.ok) {
            return fail(400, { op: "profile", errors: parsed.failure.data.errors, values: formValues(formData) });
        }
        const member = await getMember(world.id, params.memberId);
        if (!member) error(404, "Not found");
        if (!member.email) return fail(400, { op: "profile", profileError: "noEmail" as const });
        const result = await saveMemberProfile(
            access.organization.id,
            member.email,
            normalizeProfileInput(parsed.data),
            account.id,
        );
        if (result.status !== "ok") {
            return fail(400, {
                op: "profile",
                profileError: result.status,
                errors: { managerEmail: "validation" as const },
                values: formValues(formData),
            });
        }
        if (result.changed.length > 0) {
            // Field names only: the values are on the member page, and the audit log stays free of profile data.
            await audit({
                action: "member.profile.update",
                account,
                organizationId: access.organization.id,
                worldId: world.id,
                targetType: "member",
                targetId: member.id,
                ipAddress: locals.clientIp ?? null,
                details: { fields: result.changed },
            });
        }
        return { success: true, op: "profile" };
    },

    ban: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "moderation.manage");
        const member = await getMember(world.id, params.memberId);
        if (!member) error(404, "Not found");
        const parsed = parseForm(await request.formData(), BanForm);
        if (!parsed.ok) return fail(400, { op: "ban", errors: parsed.failure.data.errors });
        if (parsed.data.ipAddress && !isIP(parsed.data.ipAddress)) {
            return fail(400, { op: "ban", errors: { ipAddress: "validation" as const } });
        }
        const { liveDisconnect } = await banFromBackOffice({
            organization: access.organization,
            world,
            account,
            clientIp: locals.clientIp,
            memberUuid: member.uuid,
            name: member.name ?? member.email,
            ipAddress: parsed.data.ipAddress ?? null,
            reason: parsed.data.reason,
            duration: parsed.data.duration,
        });
        return { success: true, op: "ban", liveDisconnect };
    },

    erase: async ({ locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
        const erased = await eraseMember(world, params.memberId);
        if (!erased) error(404, "Not found");
        // The identifier is personal data: the audit trail keeps the internal id and the counts only.
        await audit({
            action: "member.erase",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "member",
            targetId: erased.member.id,
            ipAddress: locals.clientIp ?? null,
            details: {
                activeBansKept: erased.activeBansKept,
                bansPseudonymized: erased.bansPseudonymized,
                reportsPseudonymized: erased.reportsPseudonymized,
                auditEntriesPseudonymized: erased.auditEntriesPseudonymized,
                recordingEventsDeleted: erased.recordingEventsDeleted,
                analyticsEventsDeleted: erased.analyticsEventsDeleted,
            },
        });
        redirect(303, `/o/${params.org}/w/${params.world}/members?erased=1&keptBans=${erased.activeBansKept}`);
    },
};
