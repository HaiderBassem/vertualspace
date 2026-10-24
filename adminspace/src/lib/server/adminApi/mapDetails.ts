/**
 * Builds the MapDetailsData WorkAdventure receives from GET /api/map.
 *
 * Feature flags are only sent when a world sets them: WorkAdventure treats an absent flag as "enabled"
 * (and still applies its own ENABLE_* environment variables on top), except canReport which it treats
 * as disabled, so canReport is always sent.
 */
import { isHttpUrl } from "../http/forms";
import { openSecret } from "../services/secrets";
import type { MapDetailsData } from "../../contract/workadventure";
import type { WorldSettings } from "../../settings/worldSettings";
import type { Organization, Room, World } from "../services/worlds";

export interface MapDetailsInput {
    organization: Organization;
    world: World;
    room: Room;
    settings: WorldSettings;
}

function defined<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function buildMapDetails({ organization, world, room, settings }: MapDetailsInput): MapDetailsData {
    const branding = settings.branding ?? {};
    const meta = settings.metaTags ?? {};
    const legal = settings.legal ?? {};
    const features = settings.features ?? {};
    const woka = settings.woka ?? {};
    const thirdParty = settings.thirdParty ?? {};
    const recording = settings.permissions?.recording ?? "disabled";

    const hasMetaTags = Object.values(meta).some((v) => v !== undefined);
    const hasLegal = Boolean(legal.termsOfUseUrl || legal.privacyPolicyUrl || legal.cookiePolicyUrl);

    return {
        ...(room.mapKind === "wam" && isHttpUrl(room.wamUrl) ? { wamUrl: room.wamUrl } : {}),
        ...(room.mapKind === "tmj" && isHttpUrl(room.mapUrl) ? { mapUrl: room.mapUrl } : {}),
        group: `${organization.slug}/${world.slug}`,
        roomName: room.name,
        authenticationMandatory: world.accessPolicy !== "public",
        editable: room.mapKind === "wam",
        canReport: features.report ?? true,
        expireOn: world.expiresAt?.toISOString(),
        contactPage: legal.contactPage ?? null,
        reportIssuesUrl: legal.reportIssuesUrl ?? null,
        opidWokaNamePolicy: woka.namePolicy ?? null,
        loadingLogo: branding.loadingLogo ?? null,
        loginSceneLogo: branding.loginSceneLogo ?? null,
        errorSceneLogo: branding.errorSceneLogo ?? null,
        backgroundSceneImage: branding.backgroundSceneImage ?? null,
        backgroundColor: branding.backgroundColor ?? null,
        primaryColor: branding.primaryColor ?? null,
        showPoweredBy: branding.showPoweredBy ?? true,
        ...defined({
            enableChat: features.chat,
            enableMatrixChat: features.matrixChat,
            enableChatUpload: features.chatUpload,
            enableChatOnlineList: features.chatOnlineList,
            enableChatDisconnectedList: features.chatDisconnectedList,
            enableSay: features.say,
            enableIssueReport: features.issueReport,
            skipCameraPage: features.skipCameraPage,
            defaultCameraPrivacySettings: features.defaultCameraPrivacy,
            defaultMicrophonePrivacySettings: features.defaultMicrophonePrivacy,
            bypassPwa: features.bypassPwa,
            provideDefaultWokaName: woka.provideDefaultName,
            provideDefaultWokaTexture: woka.provideDefaultTexture,
        }),
        defaultWokaName: woka.defaultName ?? null,
        defaultWokaTexture: woka.defaultTexture ?? null,
        modules: settings.modules ?? null,
        entityCollectionsUrls: settings.entityCollectionsUrls ?? null,
        metadata: {
            ...(settings.metadata ?? {}),
            ...(features.tutorial !== undefined ? { enableTutorial: features.tutorial } : {}),
        },
        // The pusher strips thirdParty before handing MapDetailsData to browsers; only the back uses it.
        thirdParty:
            thirdParty.jitsiUrl || thirdParty.bbbUrl
                ? {
                      jitsi: thirdParty.jitsiUrl
                          ? {
                                url: thirdParty.jitsiUrl,
                                iss: thirdParty.jitsiIss ?? null,
                                secret: openSecret(thirdParty.jitsiSecret) ?? null,
                            }
                          : null,
                      bbb: thirdParty.bbbUrl
                          ? { url: thirdParty.bbbUrl, secret: openSecret(thirdParty.bbbSecret) ?? null }
                          : null,
                  }
                : null,
        metatags: hasMetaTags
            ? {
                  title: meta.title ?? world.name,
                  description: meta.description ?? world.description ?? "",
                  author: meta.author ?? organization.name,
                  provider: meta.provider ?? organization.name,
                  ...defined({
                      appName: meta.appName,
                      shortAppName: meta.shortAppName,
                      themeColor: meta.themeColor,
                      cardImage: meta.cardImage,
                  }),
                  ...(meta.favIconUrl ? { favIcons: [{ rel: "icon", sizes: "any", src: meta.favIconUrl }] } : {}),
              }
            : null,
        legals: hasLegal
            ? {
                  termsOfUseUrl: legal.termsOfUseUrl ?? null,
                  privacyPolicyUrl: legal.privacyPolicyUrl ?? null,
                  cookiePolicyUrl: legal.cookiePolicyUrl ?? null,
              }
            : null,
        recording: { buttonState: recording === "disabled" ? "hidden" : "enabled", disabledReason: null },
    };
}
