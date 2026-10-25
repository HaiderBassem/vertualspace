/**
 * Stands in for @sveltejs/kit in the command-line tools (`build/cli/*.js`). SvelteKit is a build-time dependency that the
 * production image does not carry, while the services these tools share with the web server import its `error`,
 * `redirect` and `fail` helpers. There is no request to answer here: they simply throw.
 */
export function error(status: number, body: string | { message: string }): never {
    throw Object.assign(new Error(typeof body === "string" ? body : body.message), { status });
}

export function redirect(status: number, location: string | URL): never {
    throw Object.assign(new Error(`Redirect to ${location}`), { status, location: String(location) });
}

export function fail<T>(status: number, data?: T): { status: number; data: T | undefined } {
    return { status, data };
}

export type Cookies = unknown;
export type ActionFailure<T> = { status: number; data: T };
