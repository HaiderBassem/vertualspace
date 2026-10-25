/**
 * Environment configuration, validated once at startup.
 *
 * Read from process.env (not $env/dynamic) so that CLI scripts run with tsx share it.
 * See .env.example for documentation of each variable.
 */
import { z } from "zod";

const booleanFlag = (fallback: "true" | "false") =>
    z
        .enum(["true", "false"])
        .default(fallback)
        .transform((v) => v === "true");

/** An optional value where an empty string (an unset line of an env file) means "not set". */
const optionalSetting = z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined));

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url().default("postgres://adminspace:adminspace@localhost:5432/adminspace"),
    /** Maximum number of PostgreSQL connections of each server process. */
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    /**
     * Shared with WorkAdventure (play and back): the value of their ADMIN_API_TOKEN.
     * WorkAdventure sends it raw in the Authorization header of every Admin API call.
     */
    ADMIN_API_TOKEN: z.string().min(1, "ADMIN_API_TOKEN is required"),
    /** Shared with the pusher's ADMIN_SOCKETS_TOKEN, to sign JWTs for its admin websocket. Optional. */
    ADMIN_SOCKETS_TOKEN: z.string().optional(),
    /** Secret used to pseudonymize identifiers and to derive the encryption key. 32+ chars. */
    APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
    /** BCP 47 locale used when nothing else matches. */
    DEFAULT_LOCALE: z.string().default("en-US"),
    /** Idle session lifetime in hours: a session unused for this long expires. */
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    /** Absolute session lifetime in hours, whatever the activity. */
    SESSION_ABSOLUTE_HOURS: z.coerce.number().int().positive().default(168),
    /** Maximum number of active sessions per account; the oldest are ended beyond it. */
    SESSION_MAX_PER_ACCOUNT: z.coerce.number().int().positive().default(20),
    /** Require every back-office account to enable TOTP two-factor authentication. */
    REQUIRE_MFA: booleanFlag("false"),
    /**
     * Token required by the first-run web setup (/setup). In production, /setup is refused unless it is
     * set: create the first superadmin with `npm run superadmin:create` instead.
     */
    SETUP_TOKEN: z.string().min(16, "SETUP_TOKEN must be at least 16 characters").optional(),
    /** Rate limits (0 disables a limit). Shared by every instance through the database. */
    RATE_LIMIT_ADMIN_API_PER_MINUTE: z.coerce.number().int().min(0).default(600),
    RATE_LIMIT_LOGIN_PER_IP: z.coerce.number().int().min(0).default(30),
    RATE_LIMIT_LOGIN_PER_ACCOUNT: z.coerce.number().int().min(0).default(10),
    RATE_LIMIT_MFA_PER_IP: z.coerce.number().int().min(0).default(30),
    RATE_LIMIT_SETUP_PER_IP: z.coerce.number().int().min(0).default(10),
    RATE_LIMIT_SENSITIVE_PER_ACCOUNT: z.coerce.number().int().min(0).default(20),
    /** Self-service registrations per client IP and hour. */
    RATE_LIMIT_REGISTRATION_PER_IP: z.coerce.number().int().min(0).default(10),
    /** Password-reset requests per client IP and hour (each address also gets at most 3 per hour). */
    RATE_LIMIT_PASSWORD_RESET_PER_IP: z.coerce.number().int().min(0).default(10),
    /** Invitations sent per organization and hour (bulk invitations count each address). */
    RATE_LIMIT_INVITATIONS_PER_ORGANIZATION: z.coerce.number().int().min(0).default(200),
    /** Component changes per organization and hour: uploads, installs, removals, rooms from templates, repairs. */
    RATE_LIMIT_COMPONENT_CHANGES_PER_ORGANIZATION: z.coerce.number().int().min(0).default(120),
    /** Storage for the components an organization uploads, in MB (0 = no limit). */
    COMPONENT_STORAGE_PER_ORGANIZATION_MB: z.coerce.number().int().min(0).default(200),
    /** One JSON line per request on stdout. */
    LOG_REQUESTS: booleanFlag("true"),
    /**
     * Public URL of this admin. Links sent by email (invitations, verification, password reset) are built
     * from it and never from the request's Host header (host-header poisoning). Required in production
     * for email links; adapter-node also uses it for its CSRF check.
     */
    ORIGIN: z.string().url().optional(),
    /**
     * Outgoing mail server, e.g. smtps://user:password@smtp.example.com:465 or smtp://localhost:1025.
     * Without it, nothing is emailed: invitation links are shown to the inviter instead, and features
     * that cannot work without email (verified registration, password reset by email) say so.
     */
    SMTP_URL: z
        .string()
        .regex(/^smtps?:\/\//, "SMTP_URL must start with smtp:// or smtps://")
        .optional()
        .or(z.literal("").transform(() => undefined)),
    /** Sender of every email, e.g. "AdminSpace <no-reply@example.com>". Required with SMTP_URL. */
    MAIL_FROM: z.string().max(320).optional(),
    /** Lifetime of invitation links, in hours (default 7 days). */
    INVITATION_TTL_HOURS: z.coerce
        .number()
        .int()
        .min(1)
        .max(24 * 90)
        .default(168),
    /** Run the background job worker in this process (disable on extra web-only instances). */
    JOB_WORKER: booleanFlag("true"),
    /** Initial instance settings, applied when the instance_settings row does not exist yet. */
    WORKADVENTURE_PLAY_URL: z.string().url().optional(),
    /** Same as WorkAdventure SECRET_KEY, for authenticated editor launches from the back office. */
    WORKADVENTURE_PLAYER_TOKEN_SECRET: z.string().min(32).optional(),
    WORKADVENTURE_PUSHER_INTERNAL_URL: z.string().url().optional(),
    WORKADVENTURE_MAP_STORAGE_PUBLIC_URL: z.string().url().optional(),
    WORKADVENTURE_MAP_STORAGE_INTERNAL_URL: z.string().url().optional(),
    WORKADVENTURE_MAP_STORAGE_API_TOKEN: z.string().optional(),
    WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN: z.string().optional(),
    WORKADVENTURE_START_ROOM_URL: z.string().optional(),

    // Integration Center (docs/INTEGRATIONS.md). Each provider is offered only when its variables are set;
    // redirect URIs are built from ORIGIN: {ORIGIN}/integrations/oauth/{provider}/callback.
    GOOGLE_OAUTH_CLIENT_ID: optionalSetting,
    GOOGLE_OAUTH_CLIENT_SECRET: optionalSetting,
    MICROSOFT_OAUTH_CLIENT_ID: optionalSetting,
    MICROSOFT_OAUTH_CLIENT_SECRET: optionalSetting,
    /** Entra ID tenant: a tenant id or domain, "organizations" (any work account, default) or "common". */
    MICROSOFT_OAUTH_TENANT: z
        .string()
        .regex(/^[A-Za-z0-9.-]{1,100}$/, "MICROSOFT_OAUTH_TENANT must be a tenant id, a domain or organizations")
        .default("organizations"),
    SLACK_CLIENT_ID: optionalSetting,
    SLACK_CLIENT_SECRET: optionalSetting,
    /** Verifies the requests of Slack's Events API (/integrations/webhooks/slack). */
    SLACK_SIGNING_SECRET: optionalSetting,
    GITHUB_OAUTH_CLIENT_ID: optionalSetting,
    GITHUB_OAUTH_CLIENT_SECRET: optionalSetting,
    /** GitLab instance (self-managed or https://gitlab.com). */
    GITLAB_BASE_URL: z
        .string()
        .url()
        .refine((value) => /^https?:\/\//.test(value), "GITLAB_BASE_URL must be an http(s) URL")
        .default("https://gitlab.com"),
    GITLAB_CLIENT_ID: optionalSetting,
    GITLAB_CLIENT_SECRET: optionalSetting,
    NOTION_CLIENT_ID: optionalSetting,
    NOTION_CLIENT_SECRET: optionalSetting,
    TRELLO_API_KEY: optionalSetting,
    MIRO_CLIENT_ID: optionalSetting,
    MIRO_CLIENT_SECRET: optionalSetting,
    SPOTIFY_CLIENT_ID: optionalSetting,
    SPOTIFY_CLIENT_SECRET: optionalSetting,
    /**
     * Host names or IP addresses that outgoing webhooks may reach although they are private (a self-hosted n8n on
     * the internal network, for example), comma-separated. Every other private, loopback or link-local address is
     * refused (SSRF protection), and plain http is accepted only for these hosts.
     */
    INTEGRATION_ALLOWED_PRIVATE_HOSTS: z
        .string()
        .default("")
        .transform((value) =>
            value
                .split(",")
                .map((host) =>
                    host
                        .trim()
                        .toLowerCase()
                        .replace(/^\[|\]$/g, ""),
                )
                .filter((host) => host.length > 0),
        ),
    /** Calls of the automation API (/automation/v1) per token and minute (0 disables the limit). */
    RATE_LIMIT_AUTOMATION_PER_TOKEN: z.coerce.number().int().min(0).default(60),
});

export type Config = z.infer<typeof EnvSchema>;

/** Values published in examples and defaults: anyone could know them. */
const KNOWN_PLACEHOLDERS = new Set(["123", "secret", "changeme", "password", "admin"]);

function isPlaceholder(value: string): boolean {
    const lower = value.toLowerCase();
    return KNOWN_PLACEHOLDERS.has(lower) || lower.includes("change-me") || lower.includes("changeme");
}

/** Problems with the shared secrets. Fatal in production, warnings elsewhere. */
export function secretProblems(env: Pick<Config, "ADMIN_API_TOKEN" | "APP_SECRET" | "ADMIN_SOCKETS_TOKEN">): string[] {
    const problems: string[] = [];
    if (env.ADMIN_API_TOKEN.length < 32) problems.push("ADMIN_API_TOKEN must be at least 32 characters");
    if (isPlaceholder(env.ADMIN_API_TOKEN)) problems.push("ADMIN_API_TOKEN is a placeholder value");
    if (isPlaceholder(env.APP_SECRET)) problems.push("APP_SECRET is a placeholder value");
    if (env.ADMIN_SOCKETS_TOKEN !== undefined && env.ADMIN_SOCKETS_TOKEN !== "") {
        if (env.ADMIN_SOCKETS_TOKEN.length < 32) problems.push("ADMIN_SOCKETS_TOKEN must be at least 32 characters");
        if (isPlaceholder(env.ADMIN_SOCKETS_TOKEN)) problems.push("ADMIN_SOCKETS_TOKEN is a placeholder value");
    }
    return problems;
}

export function parseConfig(source: Record<string, string | undefined>): Config {
    const parsed = EnvSchema.safeParse(source);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    if (parsed.data.SMTP_URL && !parsed.data.MAIL_FROM) {
        throw new Error("Invalid environment configuration:\n  - MAIL_FROM is required when SMTP_URL is set");
    }
    const problems = secretProblems(parsed.data);
    if (problems.length > 0) {
        if (parsed.data.NODE_ENV === "production") {
            throw new Error(`Insecure configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
        }
        if (parsed.data.NODE_ENV === "development") {
            console.warn(`[config] Insecure secrets (refused in production): ${problems.join("; ")}`);
        }
    }
    return parsed.data;
}

let cached: Config | undefined;

export function config(): Config {
    cached ??= parseConfig(process.env);
    return cached;
}
