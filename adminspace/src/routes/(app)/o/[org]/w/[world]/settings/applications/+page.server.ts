import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { ApplicationSettings, readWorldSettings } from "$lib/settings/worldSettings";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { checkbox, optionalText, optionalUrl, parseForm, requiredText } from "$lib/server/http/forms";
import { saveWorldSettings } from "$lib/server/services/worldAdmin";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "world.update");
    return { applications: readWorldSettings(world.settings).applications ?? [] };
};

const ApplicationForm = z.object({
    index: z.coerce.number().int().min(-1),
    name: requiredText(100),
    description: optionalText(500),
    image: optionalUrl,
    doc: optionalUrl,
    script: optionalUrl,
    regexUrl: optionalText(500).refine((v) => {
        if (!v) return true;
        try {
            new RegExp(v);
            return true;
        } catch {
            return false;
        }
    }),
    // http(s) only, like every URL given to WorkAdventure clients ($1-style placeholders are allowed).
    targetUrl: optionalUrl,
    policy: optionalText(500),
    enabled: checkbox,
    default: checkbox,
    forceNewTab: checkbox,
    allowAPI: checkbox,
});

export const actions: Actions = {
    save: async ({ request, locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        const parsed = parseForm(await request.formData(), ApplicationForm);
        if (!parsed.ok) return parsed.failure;
        const { index, ...fields } = parsed.data;
        const application = ApplicationSettings.parse(fields);
        const applications = [...(readWorldSettings(world.settings).applications ?? [])];
        if (index >= 0) {
            if (index >= applications.length) return fail(404, { message: "notFound" as const });
            applications[index] = application;
        } else {
            applications.push(application);
        }
        await saveWorldSettings(world, { applications });
        await audit({
            action: index >= 0 ? "world.application.update" : "world.application.create",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "application",
            targetId: application.name,
            ipAddress: locals.clientIp ?? null,
        });
        return { saved: true };
    },
    remove: async ({ request, locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        const index = Number((await request.formData()).get("index"));
        const applications = [...(readWorldSettings(world.settings).applications ?? [])];
        const removed = Number.isInteger(index) ? applications[index] : undefined;
        if (!removed) return fail(404, { message: "notFound" as const });
        applications.splice(index, 1);
        await saveWorldSettings(world, { applications: applications.length > 0 ? applications : undefined });
        await audit({
            action: "world.application.delete",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "application",
            targetId: removed.name,
            ipAddress: locals.clientIp ?? null,
        });
        return { removed: true };
    },
};
