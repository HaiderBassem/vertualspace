import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { MANIFEST_SCHEMA } from "$lib/catalog/manifest";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { componentChangeAllowed } from "$lib/server/catalog/install";
import { readZip } from "$lib/server/catalog/mapStorage";
import { organizationStorageBytes, storeComponentVersion } from "$lib/server/catalog/store";
import { config } from "$lib/server/config";
import { LIMITS, validatePackage, type Issue } from "$lib/server/catalog/validate";

export const load: PageServerLoad = async ({ locals, params }) => {
    await loadOrganization(locals, params.org, "component.manage");
    return { schema: MANIFEST_SCHEMA, maxBytes: LIMITS.packageBytes };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "component.manage");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { uploadError: "rateLimited" as const, issues: [] as Issue[] });
        }
        const file = (await request.formData()).get("package");
        if (!(file instanceof File) || file.size === 0 || file.size > LIMITS.packageBytes) {
            return fail(400, { uploadError: "invalidArchive" as const, issues: [] as Issue[] });
        }
        let files: Map<string, Buffer>;
        try {
            files = readZip(Buffer.from(await file.arrayBuffer()), {
                maxEntries: 64,
                maxEntryBytes: LIMITS.mapBytes,
                maxTotal: LIMITS.packageBytes,
            });
        } catch {
            // ZipError, but also corrupt deflate data (zlib errors) or impossible sizes: never a server error.
            return fail(400, { uploadError: "invalidArchive" as const, issues: [] as Issue[] });
        }
        const manifestBytes = files.get("manifest.json");
        files.delete("manifest.json");
        let manifest: unknown;
        try {
            manifest = manifestBytes ? JSON.parse(manifestBytes.toString("utf8")) : undefined;
        } catch {
            manifest = undefined;
        }
        let validation: ReturnType<typeof validatePackage>;
        try {
            validation = validatePackage(manifest, files);
        } catch {
            const issues: Issue[] = [{ code: "manifestInvalid", path: "manifest.json" }];
            return fail(400, { uploadError: "problems" as const, issues });
        }
        if (!validation.ok) {
            return fail(400, { uploadError: "problems" as const, issues: validation.issues.slice(0, 30) });
        }
        const quotaMb = config().COMPONENT_STORAGE_PER_ORGANIZATION_MB;
        if (quotaMb > 0) {
            const incoming = validation.files.reduce((sum, f) => sum + f.bytes.length, 0);
            if ((await organizationStorageBytes(access.organization.id)) + incoming > quotaMb * 1024 * 1024) {
                return fail(413, { uploadError: "quotaExceeded" as const, issues: [] as Issue[], quotaMb });
            }
        }
        const stored = await storeComponentVersion({
            organizationId: access.organization.id,
            publisher: access.organization.name,
            createdBy: account.id,
            publish: true,
            validation,
        });
        if (stored.result === "invalid")
            return fail(400, { uploadError: "problems" as const, issues: validation.issues });
        if (stored.result === "versionExists" || stored.result === "kindChanged") {
            return fail(409, { uploadError: stored.result, issues: [] as Issue[] });
        }
        if (stored.result === "created") {
            await audit({
                action: "component.publish",
                account,
                organizationId: access.organization.id,
                targetType: "component",
                targetId: stored.componentId,
                ipAddress: locals.clientIp ?? null,
                details: { key: validation.manifest?.key, version: validation.manifest?.version },
            });
        }
        redirect(303, `/o/${access.organization.slug}/components/${stored.componentId}`);
    },
};
