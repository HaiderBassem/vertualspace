/**
 * Per-world settings, stored as jsonb in worlds.settings and turned into WorkAdventure's
 * MapDetailsData / FetchMemberDataByUuidResponse by the Admin API.
 *
 * Every field is optional: an absent field means "use WorkAdventure's default". Parse stored
 * values with readWorldSettings(): it keeps every valid field and drops only invalid ones, so old
 * rows keep working when fields are added and one bad value never wipes a whole world's settings.
 *
 * URLs are http(s) only: they end up in links, iframes and scripts run by WorkAdventure clients.
 * Secrets (thirdParty.*Secret) are stored sealed (AES-256-GCM, see services/secrets.ts).
 */
import { z } from "zod";

function isHttpUrl(value: string): boolean {
    try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}

const httpUrl = z.string().trim().max(2048).url().refine(isHttpUrl);
const optionalUrl = httpUrl.optional().or(z.literal("").transform(() => undefined));
const hexColor = z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("").transform(() => undefined));
/** A sealed secret ("v1.<iv>.<tag>.<data>") or, for rows written before sealing, the plain value. */
const secret = z.string().max(4000).optional();
const tagName = z.string().trim().min(1).max(64);

export const BrandingSettings = z.object({
    loadingLogo: optionalUrl,
    loginSceneLogo: optionalUrl,
    errorSceneLogo: optionalUrl,
    backgroundSceneImage: optionalUrl,
    backgroundColor: hexColor,
    primaryColor: hexColor,
    showPoweredBy: z.boolean().optional(),
});

export const MetaTagsSettings = z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    author: z.string().max(200).optional(),
    provider: z.string().max(200).optional(),
    appName: z.string().max(100).optional(),
    shortAppName: z.string().max(30).optional(),
    themeColor: hexColor,
    cardImage: optionalUrl,
    favIconUrl: optionalUrl,
});

export const LegalSettings = z.object({
    termsOfUseUrl: optionalUrl,
    privacyPolicyUrl: optionalUrl,
    cookiePolicyUrl: optionalUrl,
    contactPage: optionalUrl,
    reportIssuesUrl: optionalUrl,
});

export const FeatureSettings = z.object({
    chat: z.boolean().optional(),
    matrixChat: z.boolean().optional(),
    chatUpload: z.boolean().optional(),
    chatOnlineList: z.boolean().optional(),
    chatDisconnectedList: z.boolean().optional(),
    say: z.boolean().optional(),
    issueReport: z.boolean().optional(),
    /** In-game "report a user" feature; reports land in this back office. */
    report: z.boolean().optional(),
    inviteButton: z.boolean().optional(),
    skipCameraPage: z.boolean().optional(),
    defaultCameraPrivacy: z.boolean().optional(),
    defaultMicrophonePrivacy: z.boolean().optional(),
    bypassPwa: z.boolean().optional(),
    tutorial: z.boolean().optional(),
});

export const MapEditorPolicy = z.enum(["nobody", "tagged", "members", "everyone"]);
export const RecordingPolicy = z.enum(["disabled", "tagged", "authenticated"]);

export const WokaSettings = z.object({
    namePolicy: z.enum(["user_input", "allow_override_opid", "force_opid"]).optional(),
    provideDefaultName: z.enum(["no", "random", "fix", "fix-plus-random-numbers"]).optional(),
    defaultName: z.string().max(50).optional(),
    provideDefaultTexture: z.enum(["no", "random", "fix"]).optional(),
    defaultTexture: optionalUrl,
});

export const ApplicationSettings = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    image: optionalUrl,
    doc: optionalUrl,
    script: optionalUrl,
    regexUrl: z.string().max(500).optional(),
    /** May contain $1-style placeholders, but must still be an http(s) URL. */
    targetUrl: optionalUrl,
    enabled: z.boolean().default(true),
    default: z.boolean().default(false),
    forceNewTab: z.boolean().default(false),
    allowAPI: z.boolean().default(false),
    policy: z.string().max(500).optional(),
});
export type ApplicationSettings = z.infer<typeof ApplicationSettings>;

export const ThirdPartySettings = z.object({
    jitsiUrl: z.string().max(253).optional(),
    jitsiIss: z.string().max(200).optional(),
    jitsiSecret: secret,
    bbbUrl: optionalUrl,
    bbbSecret: secret,
    livekitHost: optionalUrl,
    livekitApiKey: z.string().max(200).optional(),
    livekitApiSecret: secret,
});

/** Names of the fields of ThirdPartySettings holding secrets (sealed at rest, never sent to browsers). */
export const THIRD_PARTY_SECRET_FIELDS = ["jitsiSecret", "bbbSecret", "livekitApiSecret"] as const;

export const PermissionSettings = z.object({
    mapEditor: MapEditorPolicy.optional(),
    /** Tags allowed to edit the map when mapEditor = "tagged". Defaults to ["admin", "editor"]. */
    mapEditorTags: z.array(tagName).max(50).optional(),
    recording: RecordingPolicy.optional(),
    /** Tags allowed to record when recording = "tagged". Defaults to ["admin"]. */
    recordingTags: z.array(tagName).max(50).optional(),
});

export const PrivacySettings = z.object({
    /** Store analytics events posted by pushers for this world. */
    analytics: z.boolean().optional(),
    /** Days after which guest (anonymous) members not seen again are deleted. 0 keeps them. */
    guestRetentionDays: z.number().int().min(0).max(3650).optional(),
    /** Days after which analytics events are deleted. */
    analyticsRetentionDays: z.number().int().min(1).max(3650).optional(),
});

export const WorldSettings = z.object({
    branding: BrandingSettings.optional(),
    metaTags: MetaTagsSettings.optional(),
    legal: LegalSettings.optional(),
    features: FeatureSettings.optional(),
    woka: WokaSettings.optional(),
    permissions: PermissionSettings.optional(),
    thirdParty: ThirdPartySettings.optional(),
    privacy: PrivacySettings.optional(),
    applications: z.array(ApplicationSettings).max(100).optional(),
    /** External modules WorkAdventure loads in this world (module names, as WorkAdventure expects). */
    modules: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
    entityCollectionsUrls: z.array(httpUrl).max(50).optional(),
    /** Free-form metadata passed to the scripting API (MapDetailsData.metadata). */
    metadata: z.record(z.unknown()).optional(),
});
export type WorldSettings = z.infer<typeof WorldSettings>;

/** Tags WorkAdventure gives map-editor rights when a world does not configure its own. */
export const DEFAULT_MAP_EDITOR_TAGS = ["admin", "editor"];
/** Tags allowed to record when a world does not configure its own. */
export const DEFAULT_RECORDING_TAGS = ["admin"];

/**
 * Tags whose holders get rights inside WorkAdventure: "admin" (ban, enter full worlds and restricted
 * rooms), "editor", and the world's map-editor and recording tags. Granting them is reserved to people
 * allowed to manage tags (permission tag.manage).
 */
export function privilegedTags(settings: WorldSettings): Set<string> {
    return new Set([
        "admin",
        "editor",
        ...(settings.permissions?.mapEditorTags ?? DEFAULT_MAP_EDITOR_TAGS),
        ...(settings.permissions?.recordingTags ?? DEFAULT_RECORDING_TAGS),
    ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
    let current = schema;
    while (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
        current = current.unwrap() as z.ZodTypeAny;
    }
    return current;
}

/** Parses one section, keeping the valid fields (objects) or items (arrays) and dropping the others. */
function readSection(schema: z.ZodTypeAny, raw: unknown): unknown {
    const inner = unwrap(schema);
    if (inner instanceof z.ZodObject && isRecord(raw)) {
        const section: Record<string, unknown> = {};
        for (const [key, field] of Object.entries(inner.shape as Record<string, z.ZodTypeAny>)) {
            if (!(key in raw)) continue;
            const parsed = field.safeParse(raw[key]);
            if (parsed.success && parsed.data !== undefined) section[key] = parsed.data;
        }
        return section;
    }
    if (inner instanceof z.ZodArray && Array.isArray(raw)) {
        const element = inner.element as z.ZodTypeAny;
        return raw.flatMap((item) => {
            const parsed = element.safeParse(item);
            return parsed.success ? [parsed.data] : [];
        });
    }
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
}

/** Parses stored settings, dropping only invalid fields instead of failing the whole world. */
export function readWorldSettings(raw: unknown): WorldSettings {
    if (!isRecord(raw)) return {};
    const settings: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(WorldSettings.shape as Record<string, z.ZodTypeAny>)) {
        if (!(key in raw)) continue;
        const value = readSection(schema, raw[key]);
        if (value !== undefined) settings[key] = value;
    }
    return settings as WorldSettings;
}
