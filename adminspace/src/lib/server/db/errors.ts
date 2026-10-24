/** Classification of PostgreSQL errors raised by constraints (SQLSTATE codes). */

/** SQLSTATE of a PostgreSQL error, also when Drizzle wraps it (DrizzleQueryError keeps it as `cause`). */
function sqlState(error: unknown): unknown {
    let current: unknown = error;
    for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
        const code = (current as { code?: unknown }).code;
        if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
        current = (current as { cause?: unknown }).cause;
    }
    return undefined;
}

/** Unique-constraint violation (23505): the value is already used. */
export function isUniqueViolation(error: unknown): boolean {
    return sqlState(error) === "23505";
}

/** Foreign-key violation (23503): the referenced row does not exist (or belongs to another tenant). */
export function isForeignKeyViolation(error: unknown): boolean {
    return sqlState(error) === "23503";
}
