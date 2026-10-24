import { error, fail } from "@sveltejs/kit";
import { ZodError } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import {
    fieldName,
    isSectionId,
    SECTIONS,
    type FieldDescriptor,
    type GroupDescriptor,
    type SectionId,
} from "$lib/components/worlds/settingsSections";
import { readWorldSettings, type WorldSettings } from "$lib/settings/worldSettings";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { formValues, type FormErrorCode } from "$lib/server/http/forms";
import { ensureSealed, sealSecret } from "$lib/server/services/secrets";
import { saveWorldSettings } from "$lib/server/services/worldAdmin";

function sectionOf(param: string): SectionId {
    if (!isSectionId(param)) error(404, "Not found");
    return param;
}

/** Current values of a group, as stored. "advanced" fields are top-level settings keys. */
function groupSource(settings: WorldSettings, group: GroupDescriptor): Record<string, unknown> {
    if (group.key === "advanced") {
        return {
            modules: settings.modules,
            entityCollectionsUrls: settings.entityCollectionsUrls,
            metadata: settings.metadata,
        };
    }
    return (settings[group.key] as Record<string, unknown> | undefined) ?? {};
}

function toFormValue(field: FieldDescriptor, value: unknown): string {
    if (value === undefined || value === null) return "";
    switch (field.type) {
        case "secret":
            // Secrets never leave the server: the form only says whether one is saved.
            return "";
        case "bool3":
            return value === true ? "true" : value === false ? "false" : "";
        case "list":
            return Array.isArray(value) ? value.join("\n") : "";
        case "json":
            return JSON.stringify(value, null, 2);
        default:
            return String(value);
    }
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const section = sectionOf(params.section);
    const { world, access } = await loadWorld(locals, params.org, params.world, "world.update");
    const settings = readWorldSettings(world.settings);
    const values: Record<string, string> = {};
    const secretsSet: Record<string, boolean> = {};
    for (const group of SECTIONS[section]) {
        const source = groupSource(settings, group);
        for (const field of group.fields) {
            const name = fieldName(group.key, field.prop);
            values[name] = toFormValue(field, source[field.prop]);
            if (field.type === "secret") secretsSet[name] = Boolean(source[field.prop]);
        }
    }
    return { section, values, secretsSet, canReadSecrets: access.can("secrets.read") };
};

const COLOR = /^#[0-9a-fA-F]{6}$/;

function isUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

type ParsedField = { ok: true; value: unknown } | { ok: false; code: FormErrorCode };

function parseField(field: FieldDescriptor, raw: string, current: unknown, clear: boolean): ParsedField {
    const value = raw.trim();
    switch (field.type) {
        case "text":
        case "textarea":
            if (field.max && value.length > field.max) return { ok: false, code: "tooLong" };
            return { ok: true, value: value || undefined };
        case "url":
            if (value && (!isUrl(value) || value.length > 2048)) return { ok: false, code: "invalidUrl" };
            return { ok: true, value: value || undefined };
        case "color":
            if (value && !COLOR.test(value)) return { ok: false, code: "invalidColor" };
            return { ok: true, value: value || undefined };
        case "bool3":
            return { ok: true, value: value === "true" ? true : value === "false" ? false : undefined };
        case "select":
            if (value && !(field.options ?? []).includes(value)) return { ok: false, code: "validation" };
            return { ok: true, value: value || undefined };
        case "number": {
            if (!value) return { ok: true, value: undefined };
            const n = Number(value);
            if (
                !Number.isInteger(n) ||
                (field.min !== undefined && n < field.min) ||
                (field.max !== undefined && n > field.max)
            ) {
                return { ok: false, code: "validation" };
            }
            return { ok: true, value: n };
        }
        case "list": {
            const items = raw
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            if (field.prop === "entityCollectionsUrls" && items.some((item) => !isUrl(item))) {
                return { ok: false, code: "invalidUrl" };
            }
            return { ok: true, value: items.length > 0 ? items : undefined };
        }
        case "secret":
            if (clear) return { ok: true, value: undefined };
            if (field.max && value.length > field.max) return { ok: false, code: "tooLong" };
            // Stored sealed. Blank keeps the saved value (sealing a legacy plain value on the way).
            return {
                ok: true,
                value: value ? sealSecret(value) : ensureSealed(typeof current === "string" ? current : undefined),
            };
        case "json": {
            if (!value) return { ok: true, value: undefined };
            try {
                const parsed: unknown = JSON.parse(value);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                    return { ok: false, code: "validation" };
                }
                return { ok: true, value: parsed };
            } catch {
                return { ok: false, code: "validation" };
            }
        }
    }
}

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const section = sectionOf(params.section);
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        const formData = await request.formData();
        const values = formValues(formData);
        const settings = readWorldSettings(world.settings);

        const errors: Record<string, FormErrorCode> = {};
        const patch: Record<string, unknown> = {};
        const changedFields: string[] = [];

        for (const group of SECTIONS[section]) {
            const source = groupSource(settings, group);
            const cleaned: Record<string, unknown> = {};
            for (const field of group.fields) {
                const name = fieldName(group.key, field.prop);
                // Secrets (video providers' keys) change only with secrets.read: not for workspace managers
                // nor support access, who keep the saved value whatever they post.
                if (field.type === "secret" && !access.can("secrets.read")) {
                    if (source[field.prop] !== undefined) cleaned[field.prop] = source[field.prop];
                    continue;
                }
                const result = parseField(
                    field,
                    values[name] ?? "",
                    source[field.prop],
                    formData.get(`${name}__clear`) === "on",
                );
                if (!result.ok) {
                    errors[name] = result.code;
                    continue;
                }
                if (result.value !== undefined) cleaned[field.prop] = result.value;
                if (JSON.stringify(result.value) !== JSON.stringify(source[field.prop])) changedFields.push(name);
            }
            if (group.key === "advanced") {
                patch.modules = cleaned.modules;
                patch.entityCollectionsUrls = cleaned.entityCollectionsUrls;
                patch.metadata = cleaned.metadata;
            } else {
                patch[group.key] = Object.keys(cleaned).length > 0 ? cleaned : undefined;
            }
        }

        // Secrets typed by the person are never echoed back.
        const echoed = Object.fromEntries(Object.entries(values).filter(([key]) => !/Secret$/.test(key)));
        if (Object.keys(errors).length > 0) {
            return fail(400, { errors, values: echoed, message: "validation" as const });
        }

        try {
            await saveWorldSettings(world, patch as Partial<WorldSettings>);
        } catch (e) {
            if (e instanceof ZodError) {
                return fail(400, { errors: {}, values: echoed, message: "validation" as const });
            }
            throw e;
        }

        if (changedFields.length > 0) {
            await audit({
                action: `world.settings.${section}`,
                account,
                organizationId: access.organization.id,
                worldId: world.id,
                targetType: "world",
                targetId: world.id,
                ipAddress: locals.clientIp ?? null,
                // Only the names of the changed fields: values may be secret.
                details: { fields: changedFields },
            });
        }
        return { success: true };
    },
};
