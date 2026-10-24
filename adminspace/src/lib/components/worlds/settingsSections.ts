/**
 * Declarative description of the world settings forms, shared by the server (parsing) and the
 * page (rendering). Each group maps to a key of WorldSettings (src/lib/settings/worldSettings.ts),
 * except "advanced", whose fields are top-level keys (modules, entityCollectionsUrls, metadata).
 * Form field names are "<group>.<prop>".
 */

export type FieldType =
    "text" | "textarea" | "url" | "color" | "bool3" | "select" | "number" | "list" | "secret" | "json";

export interface FieldDescriptor {
    prop: string;
    type: FieldType;
    options?: readonly string[];
    max?: number;
    min?: number;
}

export type GroupKey =
    "branding" | "features" | "woka" | "permissions" | "thirdParty" | "legal" | "metaTags" | "privacy" | "advanced";

export interface GroupDescriptor {
    key: GroupKey;
    fields: FieldDescriptor[];
}

export type SectionId =
    "branding" | "features" | "avatars" | "permissions" | "integrations" | "legal" | "privacy" | "advanced";

const url = (prop: string): FieldDescriptor => ({ prop, type: "url" });
const bool3 = (prop: string): FieldDescriptor => ({ prop, type: "bool3" });
const text = (prop: string, max: number): FieldDescriptor => ({ prop, type: "text", max });

export const SECTIONS: Record<SectionId, GroupDescriptor[]> = {
    branding: [
        {
            key: "branding",
            fields: [
                url("loadingLogo"),
                url("loginSceneLogo"),
                url("errorSceneLogo"),
                url("backgroundSceneImage"),
                { prop: "backgroundColor", type: "color" },
                { prop: "primaryColor", type: "color" },
                bool3("showPoweredBy"),
            ],
        },
    ],
    features: [
        {
            key: "features",
            fields: [
                "chat",
                "matrixChat",
                "chatUpload",
                "chatOnlineList",
                "chatDisconnectedList",
                "say",
                "issueReport",
                "report",
                "inviteButton",
                "skipCameraPage",
                "defaultCameraPrivacy",
                "defaultMicrophonePrivacy",
                "bypassPwa",
                "tutorial",
            ].map(bool3),
        },
    ],
    avatars: [
        {
            key: "woka",
            fields: [
                { prop: "namePolicy", type: "select", options: ["user_input", "allow_override_opid", "force_opid"] },
                {
                    prop: "provideDefaultName",
                    type: "select",
                    options: ["no", "random", "fix", "fix-plus-random-numbers"],
                },
                text("defaultName", 50),
                { prop: "provideDefaultTexture", type: "select", options: ["no", "random", "fix"] },
                url("defaultTexture"),
            ],
        },
    ],
    permissions: [
        {
            key: "permissions",
            fields: [
                { prop: "mapEditor", type: "select", options: ["nobody", "tagged", "members", "everyone"] },
                { prop: "mapEditorTags", type: "list" },
                { prop: "recording", type: "select", options: ["disabled", "tagged", "authenticated"] },
                { prop: "recordingTags", type: "list" },
            ],
        },
    ],
    integrations: [
        {
            key: "thirdParty",
            fields: [
                text("jitsiUrl", 253),
                text("jitsiIss", 200),
                { prop: "jitsiSecret", type: "secret", max: 500 },
                url("bbbUrl"),
                { prop: "bbbSecret", type: "secret", max: 500 },
                url("livekitHost"),
                text("livekitApiKey", 200),
                { prop: "livekitApiSecret", type: "secret", max: 500 },
            ],
        },
    ],
    legal: [
        {
            key: "legal",
            fields: [
                url("termsOfUseUrl"),
                url("privacyPolicyUrl"),
                url("cookiePolicyUrl"),
                url("contactPage"),
                url("reportIssuesUrl"),
            ],
        },
        {
            key: "metaTags",
            fields: [
                text("title", 200),
                { prop: "description", type: "textarea", max: 500 },
                text("author", 200),
                text("provider", 200),
                text("appName", 100),
                text("shortAppName", 30),
                { prop: "themeColor", type: "color" },
                url("cardImage"),
                url("favIconUrl"),
            ],
        },
    ],
    privacy: [
        {
            key: "privacy",
            fields: [
                bool3("analytics"),
                { prop: "guestRetentionDays", type: "number", min: 0, max: 3650 },
                { prop: "analyticsRetentionDays", type: "number", min: 1, max: 3650 },
            ],
        },
    ],
    advanced: [
        {
            key: "advanced",
            fields: [
                { prop: "modules", type: "list" },
                { prop: "entityCollectionsUrls", type: "list" },
                { prop: "metadata", type: "json" },
            ],
        },
    ],
};

export function isSectionId(value: string): value is SectionId {
    return Object.prototype.hasOwnProperty.call(SECTIONS, value);
}

export function fieldName(group: GroupKey, prop: string): string {
    return `${group}.${prop}`;
}
