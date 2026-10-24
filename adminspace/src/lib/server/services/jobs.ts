/**
 * Durable background jobs (table `jobs`): the outbox of every change AdminSpace makes in another system.
 *
 * - Enqueue in the same transaction as the local change (`enqueueJob(tx, ...)`); the network call happens
 *   later, never inside a database transaction.
 * - Claimed with FOR UPDATE SKIP LOCKED: several AdminSpace instances share the queue safely.
 * - Bounded concurrency, a timeout per run, retries with exponential backoff and jitter, and a final
 *   "failed" state that stays visible (Platform > Background jobs) until retried or cancelled.
 * - An idempotency key makes enqueueing the same work twice a no-op while it is pending; once finished,
 *   enqueueing it again re-arms it.
 * - Handlers re-check the job's organization against the resources they touch (a queue is not an
 *   isolation boundary) and must be idempotent: a crash after the remote call but before "succeeded"
 *   means the call runs again.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { logJson } from "../security/requestLog";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Job = typeof schema.jobs.$inferSelect;
export type JobStatus = Job["status"];

/** An error that retrying will not fix (bad configuration, refused by the remote side): fail at once. */
export class PermanentJobError extends Error {
    override name = "PermanentJobError";
}

/**
 * A failure the remote side asked to retry later (HTTP 429 + Retry-After): the next attempt waits at least
 * `delayMs` (capped at one hour), or the usual backoff when it is longer.
 */
export class RetryLaterJobError extends Error {
    override name = "RetryLaterJobError";
    constructor(
        message: string,
        readonly delayMs: number,
    ) {
        super(message);
    }
}

export type JobHandler = (job: Job) => Promise<Record<string, unknown> | void>;

export interface JobHooks {
    /**
     * Called after every failed attempt: `final` when no attempt is left (to show the failure). `error` is
     * the sanitized message kept on the job; `cause` the value the handler threw.
     */
    onFailure?: (job: Job, error: string, final: boolean, cause: unknown) => Promise<void>;
}

const handlers = new Map<string, { run: JobHandler; hooks: JobHooks }>();

export function registerJobHandler(kind: string, run: JobHandler, hooks: JobHooks = {}): void {
    handlers.set(kind, { run, hooks });
}

const WORKER_ID = `${process.pid}:${randomUUID().slice(0, 8)}`;
const CONCURRENCY = 4;
const RUN_TIMEOUT_MS = 60_000;
const POLL_MS = 2_000;
/** A job "running" for longer than this was abandoned by a stopped process: it is claimed again. */
const STALE_LOCK_MS = 5 * 60_000;

/** Delay before attempt `attempt + 1`: exponential (5 s, 10 s, 20 s, ... capped at 15 min), between half and all of it (jitter). */
export function retryDelayMs(attempt: number, random = Math.random): number {
    const ceiling = Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, attempt - 1));
    return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

/** Error text kept on a job: short, single line, without anything that looks like a credential. */
export function sanitizeJobError(error: unknown): string {
    const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return raw
        .replace(/(bearer|token|password|secret)[=:\s]+\S+/gi, "$1=[redacted]")
        .replace(/\s+/g, " ")
        .slice(0, 500);
}

export interface EnqueueInput {
    kind: string;
    organizationId: string | null;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    maxAttempts?: number;
    createdBy?: string | null;
    runAfter?: Date;
}

/** Records a job (inside the caller's transaction when given). Returns its id. */
export async function enqueueJob(tx: Transaction | Database, input: EnqueueInput): Promise<string> {
    const values = {
        kind: input.kind,
        organizationId: input.organizationId,
        payload: input.payload,
        idempotencyKey: input.idempotencyKey ?? null,
        maxAttempts: input.maxAttempts ?? 6,
        createdBy: input.createdBy ?? null,
        // "Now" on the database clock, which claim() compares with: a host clock slightly ahead of the
        // database's would otherwise leave a job enqueued just now not yet due for a moment.
        runAfter: input.runAfter ?? sql`now()`,
    };
    if (!input.idempotencyKey) {
        const [row] = await tx.insert(schema.jobs).values(values).returning({ id: schema.jobs.id });
        if (!row) throw new Error("Job creation returned no row");
        wake();
        return row.id;
    }
    const [row] = await tx
        .insert(schema.jobs)
        .values(values)
        .onConflictDoUpdate({
            target: schema.jobs.idempotencyKey,
            targetWhere: sql`${schema.jobs.idempotencyKey} is not null`,
            // Pending or running: leave it. Finished: run it again with the new payload.
            set: {
                status: "pending",
                payload: values.payload,
                attempts: 0,
                runAfter: values.runAfter,
                lastError: null,
                result: null,
                finishedAt: null,
                lockedAt: null,
                lockedBy: null,
            },
            setWhere: sql`${schema.jobs.status} in ('succeeded', 'failed', 'cancelled')`,
        })
        .returning({ id: schema.jobs.id });
    wake();
    if (row) return row.id;
    const existing = await tx
        .select({ id: schema.jobs.id })
        .from(schema.jobs)
        .where(eq(schema.jobs.idempotencyKey, input.idempotencyKey))
        .limit(1);
    if (!existing[0]) throw new Error("Job neither created nor found");
    return existing[0].id;
}

/** Claims up to `limit` due jobs for this worker (abandoned running jobs included). */
async function claim(limit: number): Promise<Job[]> {
    const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
    const result = await db().execute(sql`
        update jobs set status = 'running', locked_at = now(), locked_by = ${WORKER_ID},
            attempts = attempts + 1, updated_at = now()
        where id in (
            select id from jobs
            where (status = 'pending' and run_after <= now())
               or (status = 'running' and locked_at < ${staleBefore.toISOString()}::timestamptz)
            order by run_after
            limit ${limit}
            for update skip locked
        )
        returning id`);
    const ids = (result as unknown as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) return [];
    return db().select().from(schema.jobs).where(inArray(schema.jobs.id, ids));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}

async function runOne(job: Job): Promise<void> {
    const handler = handlers.get(job.kind);
    try {
        if (!handler) throw new PermanentJobError(`no handler for ${job.kind}`);
        const result = await withTimeout(handler.run(job), RUN_TIMEOUT_MS);
        await db()
            .update(schema.jobs)
            .set({
                status: "succeeded",
                result: result ?? null,
                lastError: null,
                finishedAt: new Date(),
                lockedAt: null,
                lockedBy: null,
            })
            .where(eq(schema.jobs.id, job.id));
        logJson("info", "job succeeded", { jobId: job.id, kind: job.kind, attempts: job.attempts });
    } catch (error) {
        const permanent = error instanceof PermanentJobError;
        const exhausted = job.attempts >= job.maxAttempts;
        const lastError = sanitizeJobError(error);
        await db()
            .update(schema.jobs)
            .set(
                permanent || exhausted
                    ? { status: "failed", lastError, finishedAt: new Date(), lockedAt: null, lockedBy: null }
                    : {
                          status: "pending",
                          lastError,
                          runAfter: new Date(
                              Date.now() +
                                  Math.max(
                                      retryDelayMs(job.attempts),
                                      error instanceof RetryLaterJobError ? Math.min(error.delayMs, 3_600_000) : 0,
                                  ),
                          ),
                          lockedAt: null,
                          lockedBy: null,
                      },
            )
            .where(eq(schema.jobs.id, job.id));
        await handler?.hooks
            .onFailure?.(job, lastError, permanent || exhausted, error)
            .catch((hookError: unknown) =>
                logJson("error", "job failure hook failed", { jobId: job.id, error: sanitizeJobError(hookError) }),
            );
        logJson(permanent || exhausted ? "error" : "warn", "job attempt failed", {
            jobId: job.id,
            kind: job.kind,
            attempts: job.attempts,
            final: permanent || exhausted,
            error: lastError,
        });
    }
}

/** Runs the jobs that are due now, at most `limit` (tests and the worker loop). Returns how many ran. */
export async function runDueJobs(limit = CONCURRENCY): Promise<number> {
    const jobs = await claim(limit);
    await Promise.all(jobs.map(runOne));
    return jobs.length;
}

let timer: NodeJS.Timeout | undefined;
let running = false;
let wakeRequested = false;

/** Asks the worker of this process to look for jobs now instead of at its next poll. */
function wake(): void {
    if (!timer) return;
    wakeRequested = true;
    setImmediate(() => void tick());
}

async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
        do {
            wakeRequested = false;
            while ((await runDueJobs()) > 0) {
                // Keep going while there is work.
            }
        } while (wakeRequested);
    } catch (error) {
        logJson("error", "job worker failed", { error: sanitizeJobError(error) });
    } finally {
        running = false;
    }
}

export function startJobWorker(): void {
    if (timer) return;
    timer = setInterval(() => void tick(), POLL_MS);
    timer.unref();
}

export function stopJobWorker(): void {
    if (timer) clearInterval(timer);
    timer = undefined;
}

export function jobWorkerRunning(): boolean {
    return timer !== undefined;
}

// ---------------------------------------------------------------------------------------------
// Operations (Platform > Background jobs)
// ---------------------------------------------------------------------------------------------

export async function listJobs(filter: {
    status?: JobStatus;
    organizationId?: string;
    limit: number;
}): Promise<(Job & { organizationName: string | null })[]> {
    const rows = await db()
        .select({ job: schema.jobs, organizationName: schema.organizations.name })
        .from(schema.jobs)
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.jobs.organizationId))
        .where(
            and(
                filter.status ? eq(schema.jobs.status, filter.status) : undefined,
                filter.organizationId ? eq(schema.jobs.organizationId, filter.organizationId) : undefined,
            ),
        )
        .orderBy(desc(schema.jobs.updatedAt))
        .limit(filter.limit);
    return rows.map((r) => ({ ...r.job, organizationName: r.organizationName }));
}

/** Runs a failed or cancelled job again, with a full set of attempts. */
export async function retryJob(id: string, organizationId?: string): Promise<boolean> {
    const rows = await db()
        .update(schema.jobs)
        .set({
            status: "pending",
            attempts: 0,
            runAfter: sql`now()`,
            finishedAt: null,
            lockedAt: null,
            lockedBy: null,
        })
        .where(
            and(
                eq(schema.jobs.id, id),
                inArray(schema.jobs.status, ["failed", "cancelled", "pending"]),
                organizationId ? eq(schema.jobs.organizationId, organizationId) : undefined,
            ),
        )
        .returning({ id: schema.jobs.id });
    wake();
    return rows.length > 0;
}

export async function cancelJob(id: string): Promise<boolean> {
    const rows = await db()
        .update(schema.jobs)
        .set({ status: "cancelled", finishedAt: new Date() })
        .where(and(eq(schema.jobs.id, id), inArray(schema.jobs.status, ["pending", "failed"])))
        .returning({ id: schema.jobs.id });
    return rows.length > 0;
}

/** Deletes finished jobs older than `days` (retention). */
export async function purgeFinishedJobs(days: number, now = new Date()): Promise<number> {
    const rows = await db()
        .delete(schema.jobs)
        .where(
            and(
                inArray(schema.jobs.status, ["succeeded", "cancelled"]),
                lt(schema.jobs.finishedAt, new Date(now.getTime() - days * 86_400_000)),
            ),
        )
        .returning({ id: schema.jobs.id });
    return rows.length;
}
