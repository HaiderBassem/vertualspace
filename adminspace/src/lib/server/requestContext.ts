/**
 * Per-request context (AsyncLocalStorage), set by hooks.server.ts around every request. It carries
 * facts that cross-cutting code needs without threading them through every call, e.g. the support
 * grant under which a platform administrator acts, which audit() then records on every entry.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
    /** Set by organizationAccess() when the access comes from a support grant. */
    supportGrantId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(fn: () => T): T {
    return storage.run({}, fn);
}

export function requestContext(): RequestContext | undefined {
    return storage.getStore();
}
