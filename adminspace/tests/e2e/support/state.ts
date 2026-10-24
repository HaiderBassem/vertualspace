/**
 * Run state shared between the global setup and the tests: server URLs, secrets and fixture ids.
 * Written once by global-setup.ts to OUTPUT_DIR/state.json; read (and cached) by every worker.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/** Generated files (server copy, logs, state, results, report), kept where git, ESLint and Prettier never look. */
export const OUTPUT_DIR = path.resolve(import.meta.dirname, "../../../node_modules/.cache/adminspace-e2e");
export const STATE_FILE = path.join(OUTPUT_DIR, "state.json");

export type AccountKey =
    | "super"
    | "owner"
    | "admin"
    | "moderator"
    | "viewer"
    | "ownerB"
    | "mfa"
    | "mfaStrict"
    | "lockout"
    | "logout"
    | "switcher"
    | "accept"
    | "redirect"
    | "entOwner"
    | "entAdmin"
    | "entManager"
    | "entEmployee"
    | "entRecover";

export interface OrgFixture {
    id: string;
    slug: string;
    name: string;
    world: { id: string; slug: string; name: string };
    rooms: { id: string; slug: string }[];
    tags: Record<string, string>;
    members: Record<string, { id: string; uuid: string }>;
    banId: string;
    reportId: string;
    apiKeyId: string;
    domainId: string;
}

/** The organization of the enterprise journeys (tests/e2e/enterprise.spec.ts), on the "enterprise" server. */
export interface EnterpriseFixture {
    id: string;
    slug: string;
    workspaces: { main: string; sales: string };
    /** "hq" (main workspace) has a room on the fake map-storage; "pipeline" belongs to "sales". */
    worlds: Record<"hq" | "pipeline", { id: string; slug: string }>;
    wamRoomId: string;
}

export interface E2EState {
    baseURL: string;
    strictURL: string;
    databaseUrl: string;
    databaseName: string;
    adminApiToken: string;
    appSecret: string;
    password: string;
    playUrl: string;
    /** TOTP secret (base32) of the "mfaStrict" account, seeded directly in the database. */
    mfaStrictSecret: string;
    accounts: Record<AccountKey, { id: string; email: string }>;
    orgA: OrgFixture;
    orgB: OrgFixture;
    orgDelete: { id: string; slug: string };
    worldDelete: { id: string; slug: string };
    plurals: { slug: string; worlds: number }[];
    pluralWorlds: { org: string; slug: string; members: number }[];
    /** Server with SMTP (the sink), the job worker and the fake map-storage: the enterprise journeys. */
    enterpriseURL: string;
    /** Fake WorkAdventure map-storage (tests/e2e/support/fakes.ts) and its control API. */
    mapStorageURL: string;
    /** Where the SMTP sink writes received messages (one JSON file each). */
    mailDir: string;
    orgE: EnterpriseFixture;
    /** Organization whose ownership the transfer journey hands over (owner entOwner, admin entAdmin). */
    orgT: { id: string; slug: string };
    /** A published built-in component ("desk-classic"), for the pages about one component. */
    componentId: string;
    serverPids: number[];
}

let cached: E2EState | undefined;

export function state(): E2EState {
    cached ??= JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;
    return cached;
}
