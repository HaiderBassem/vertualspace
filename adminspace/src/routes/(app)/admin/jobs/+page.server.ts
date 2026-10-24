import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";
import { formValues } from "$lib/server/http/forms";
import { cancelJob, jobWorkerRunning, listJobs, retryJob } from "$lib/server/services/jobs";

const Status = z.enum(["pending", "running", "succeeded", "failed", "cancelled"]);

function superadmin(locals: App.Locals) {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

export const load: PageServerLoad = async ({ locals, url }) => {
    superadmin(locals);
    const status = Status.safeParse(url.searchParams.get("status")).data;
    const jobs = await listJobs({ status, limit: 200 });
    return {
        status: status ?? "",
        worker: jobWorkerRunning(),
        jobs: jobs.map((job) => ({
            id: job.id,
            kind: job.kind,
            organizationName: job.organizationName,
            status: job.status,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            runAfter: job.runAfter.toISOString(),
            lastError: job.lastError,
            updatedAt: job.updatedAt.toISOString(),
        })),
    };
};

const JobForm = z.object({ id: z.string().uuid() });

export const actions: Actions = {
    retry: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = JobForm.safeParse(formValues(await request.formData()));
        if (!parsed.success || !(await retryJob(parsed.data.id))) return fail(404, { message: "notFound" as const });
        await audit({
            action: "job.retry",
            account,
            targetType: "job",
            targetId: parsed.data.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { retried: true as const };
    },
    cancel: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = JobForm.safeParse(formValues(await request.formData()));
        if (!parsed.success || !(await cancelJob(parsed.data.id))) return fail(404, { message: "notFound" as const });
        await audit({
            action: "job.cancel",
            account,
            targetType: "job",
            targetId: parsed.data.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { cancelled: true as const };
    },
};
