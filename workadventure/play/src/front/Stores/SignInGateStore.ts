import { writable } from "svelte/store";
import type { LegalsData } from "@workadventure/messages";

/**
 * Why the sign-in page is shown:
 * - "firstVisit": nobody is signed in yet (a new employee, or someone who signed out).
 * - "sessionExpired": the browser still held a login that the server no longer accepts.
 */
export type SignInGateReason = "firstVisit" | "sessionExpired";

export interface SignInGateState {
    /** The page of the OpenID provider that the "Sign in" button leads to. */
    signInUrl: string;
    reason: SignInGateReason;
    logo: string | undefined;
    backgroundImage: string | undefined;
    backgroundColor: string | undefined;
    legals: LegalsData | undefined;
    showPoweredBy: boolean | undefined;
}

/** The part of a Room that brands the sign-in page. */
export interface SignInGateBranding {
    loginSceneLogo: string | undefined;
    backgroundSceneImage: string | undefined;
    backgroundColor: string | undefined;
    legals: LegalsData | undefined;
    showPoweredBy: boolean | undefined;
}

export function buildSignInGateState(
    room: SignInGateBranding,
    signInUrl: URL,
    reason: SignInGateReason,
): SignInGateState {
    return {
        signInUrl: signInUrl.toString(),
        reason,
        logo: room.loginSceneLogo,
        backgroundImage: room.backgroundSceneImage,
        backgroundColor: room.backgroundColor,
        legals: room.legals,
        showPoweredBy: room.showPoweredBy,
    };
}

/**
 * Set while the visitor must sign in before entering the room. While it is set, a welcome page explains the
 * sign-in instead of sending the visitor straight to the page of the OpenID provider.
 */
export const signInGateStore = writable<SignInGateState | undefined>(undefined);
