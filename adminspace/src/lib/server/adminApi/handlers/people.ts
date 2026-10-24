/**
 * Members, chat, tags, reports and bans:
 * GET /api/members, GET /api/members/:uuid, PUT /api/members/:uuid/chatId, GET /api/world/tags,
 * GET /api/chat/members, POST /api/report, POST /api/ban.
 */
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { ErrorApiUnauthorizedData } from "../../../contract/workadventure";
import { messagesFor } from "../../../i18n";
import { audit } from "../../audit";
import { db, schema } from "../../db/client";
import { json } from "../../http/problem";
import {
    chatMembers,
    findMember,
    memberTagNames,
    searchMembers,
    toMemberData,
    updateMember,
    worldTagNames,
} from "../../services/members";
import { createBan, createReport } from "../../services/moderation";
import { resolveWorldOfPlayUri } from "../../services/worlds";
import { errorData } from "../../workadventure/errors";
import { query, readJson, type ApiContext } from "../router";
import { ADMIN_TAG } from "./rooms";

export async function getMembers({ url }: ApiContext): Promise<Response> {
    const context = await resolveWorldOfPlayUri(query(url, "playUri"));
    if (!context) return json([]);
    const members = await searchMembers(context.world.id, query(url, "searchText"));
    return json(members.map(toMemberData));
}

/** WorkAdventure asks for a member by uuid without telling the world: the most recent match wins. */
export async function getMember({ params }: ApiContext): Promise<Response> {
    const member = await db().query.members.findFirst({
        where: eq(schema.members.uuid, params.uuid ?? ""),
        orderBy: desc(schema.members.lastSeenAt),
    });
    if (!member) return json({ status: "error", message: "Member not found" }, { status: 404 });
    return json(toMemberData(member));
}

const ChatIdBody = z.object({
    chatId: z.string().max(320),
    userIdentifier: z.string().max(320).optional(),
    roomUrl: z.string().max(2048),
});

export async function putMemberChatId({ request, params }: ApiContext): Promise<Response> {
    const body = ChatIdBody.safeParse(await readJson(request));
    if (!body.success) return json({ status: "error", message: "Invalid body" }, { status: 400 });
    const context = await resolveWorldOfPlayUri(body.data.roomUrl);
    if (!context) return json({ status: "error", message: "Room not found" }, { status: 404 });
    const identifier = body.data.userIdentifier ?? params.uuid ?? "";
    await updateMember(context.world.id, identifier, { chatId: body.data.chatId });
    return json({ status: "ok" });
}

export async function getWorldTags({ url }: ApiContext): Promise<Response> {
    const context = await resolveWorldOfPlayUri(query(url, "playUri"));
    return json(context ? await worldTagNames(context.world.id, query(url, "searchText")) : []);
}

export async function getChatMembers({ url, locale }: ApiContext): Promise<Response> {
    const context = await resolveWorldOfPlayUri(query(url, "playUri") || query(url, "roomUrl"));
    if (!context) return json(errorData("worldNotFound", locale), { status: 404 });
    return json(await chatMembers(context.world.id, query(url, "searchText")));
}

const ReportBody = z.object({
    reportedUserUuid: z.string().min(1).max(320),
    // Longer comments are cut to 5000 characters (createReport) rather than refused.
    reportedUserComment: z.string().max(100_000),
    reporterUserUuid: z.string().min(1).max(320),
    reportWorldSlug: z.string().min(1).max(2048),
});

export async function postReport({ request, locale, clientIp }: ApiContext): Promise<Response> {
    const body = ReportBody.safeParse(await readJson(request));
    if (!body.success) return json({ status: "error", message: "Invalid body" }, { status: 400 });
    const context = await resolveWorldOfPlayUri(body.data.reportWorldSlug);
    if (!context) return json(errorData("worldNotFound", locale), { status: 404 });
    const report = await createReport({
        worldId: context.world.id,
        roomUrl: body.data.reportWorldSlug,
        reportedUuid: body.data.reportedUserUuid,
        reporterUuid: body.data.reporterUserUuid,
        comment: body.data.reportedUserComment,
    });
    await audit({
        action: "report.create",
        actorLabel: `workadventure:${body.data.reporterUserUuid}`,
        organizationId: context.organization.id,
        worldId: context.world.id,
        targetType: "member",
        targetId: body.data.reportedUserUuid,
        ipAddress: clientIp ?? null,
        details: { reportId: report.id },
    });
    return json({ status: "ok", id: report.id });
}

const BanBody = z.object({
    uuidToBan: z.string().min(1).max(320),
    playUri: z.string().min(1).max(2048),
    name: z.string().max(200),
    message: z.string().max(1000),
    byUserUuid: z.string().min(1).max(320),
    ipAddress: z.string().max(45).optional(),
});

/**
 * In-game ban. As the contract requires, a refused ban is answered 200 with an error body:
 * ErrorApiErrorData when the world or the banning person is unknown, ErrorApiUnauthorizedData when
 * the banning person does not hold the "admin" tag in the world.
 */
export async function postBan({ request, locale, clientIp }: ApiContext): Promise<Response> {
    const body = BanBody.safeParse(await readJson(request));
    if (!body.success) return json({ status: "error", message: "Invalid body" }, { status: 400 });
    const context = await resolveWorldOfPlayUri(body.data.playUri);
    if (!context) return json(errorData("worldNotFound", locale));

    const admin = await findMember(context.world.id, body.data.byUserUuid);
    if (!admin) return json(errorData("banNotAllowed", locale));
    if (!(await memberTagNames(admin.id)).includes(ADMIN_TAG)) {
        const m = messagesFor(locale).workadventure;
        const refused: ErrorApiUnauthorizedData = {
            status: "error",
            type: "unauthorized",
            code: "BAN_NOT_ALLOWED",
            title: m.errorTitle,
            subtitle: m.banNotAllowed.subtitle,
            details: m.banNotAllowed.details,
            buttonTitle: null,
        };
        return json(refused);
    }

    const target = await findMember(context.world.id, body.data.uuidToBan);
    const ban = await createBan({
        worldId: context.world.id,
        memberUuid: target?.uuid ?? body.data.uuidToBan,
        ipAddress: body.data.ipAddress ?? null,
        name: body.data.name || target?.name || null,
        reason: body.data.message,
        bannedBy: body.data.byUserUuid,
    });
    await audit({
        action: "ban.create",
        actorLabel: `workadventure:${body.data.byUserUuid}`,
        organizationId: context.organization.id,
        worldId: context.world.id,
        targetType: "member",
        targetId: ban.memberUuid ?? undefined,
        ipAddress: clientIp ?? null,
        details: { banId: ban.id, source: "in-game", ipBanned: ban.ipAddress !== null },
    });
    return json({ status: "ok", id: ban.id });
}
