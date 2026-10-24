import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import type { LegalsData } from "@workadventure/messages";
import SignInGate from "../../../src/front/Components/Login/SignInGate.svelte";
import { buildSignInGateState, type SignInGateState } from "../../../src/front/Stores/SignInGateStore";

vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const LL = readable({
        login: {
            termsOfUse: () => "terms of use",
            privacyPolicy: () => "privacy policy",
            cookiePolicy: () => "cookie policy",
            terms: ({ links }: { links: string }) => `By continuing, you agree to our ${links}.`,
            signIn: {
                titleFirstVisit: () => "Sign in to enter",
                titleSessionExpired: () => "You were signed out",
                leadFirstVisit: () => "Use the work account your administrator created.",
                leadSessionExpired: () => "Sign in again to go back.",
                button: () => "Sign in with your work account",
                redirecting: () => "Opening the sign-in page…",
                helpTitle: () => "No account yet?",
                help: () => "Ask your administrator to invite you.",
            },
        },
    });
    return { LL, locale: readable("en-US") };
});

const signInUrl = "https://login.example.test/login-screen?playUri=https%3A%2F%2Fplay.example.test%2F";

function gateState(overrides: Partial<SignInGateState> = {}): SignInGateState {
    return {
        signInUrl,
        reason: "firstVisit",
        logo: undefined,
        backgroundImage: undefined,
        backgroundColor: undefined,
        legals: undefined,
        showPoweredBy: undefined,
        ...overrides,
    };
}

describe("SignInGate", () => {
    let target: HTMLElement;
    let component: ReturnType<typeof mount> | undefined;
    let navigate: ReturnType<typeof vi.fn<(url: string) => void>>;

    function render(gate: SignInGateState): void {
        flushSync(() => {
            component = mount(SignInGate, { target, props: { gate, navigate } });
        });
    }

    function byTestId(id: string): HTMLElement | null {
        return target.querySelector(`[data-testid="${id}"]`);
    }

    beforeEach(() => {
        target = document.createElement("div");
        document.body.append(target);
        navigate = vi.fn<(url: string) => void>();
    });

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted);
        target.remove();
    });

    describe("message", () => {
        it("welcomes a visitor who is not signed in and says which account to use", () => {
            render(gateState({ reason: "firstVisit" }));

            expect(byTestId("signInGateTitle")?.textContent?.trim()).toBe("Sign in to enter");
            expect(byTestId("signInGateLead")?.textContent?.trim()).toBe(
                "Use the work account your administrator created.",
            );
            expect(byTestId("signInGateButton")?.textContent?.trim()).toBe("Sign in with your work account");
        });

        it("tells a visitor whose login ran out that they were signed out", () => {
            render(gateState({ reason: "sessionExpired" }));

            expect(byTestId("signInGateTitle")?.textContent?.trim()).toBe("You were signed out");
            expect(byTestId("signInGateLead")?.textContent?.trim()).toBe("Sign in again to go back.");
        });

        it("tells a visitor without an account where to get one", () => {
            render(gateState());

            expect(byTestId("signInGateHelp")?.textContent?.trim()).toBe("Ask your administrator to invite you.");
        });
    });

    describe("signing in", () => {
        it("puts the focus on the sign-in button so that Enter signs in", () => {
            render(gateState());

            expect(document.activeElement).toBe(byTestId("signInGateButton"));
        });

        it("goes to the sign-in page of the provider when the button is clicked", () => {
            render(gateState());

            byTestId("signInGateButton")?.click();
            flushSync();

            expect(navigate).toHaveBeenCalledExactlyOnceWith(signInUrl);
        });

        it("shows that the page is opening and ignores a second click", () => {
            render(gateState());
            const button = byTestId("signInGateButton") as HTMLButtonElement;

            button.click();
            flushSync();
            button.click();
            flushSync();

            expect(button.textContent?.trim()).toBe("Opening the sign-in page…");
            expect(button.disabled).toBe(true);
            expect(navigate).toHaveBeenCalledOnce();
        });

        it("can sign in again after coming back with the browser's back button", () => {
            render(gateState());
            const button = byTestId("signInGateButton") as HTMLButtonElement;
            button.click();
            flushSync();

            // The browser restores the page from its cache with the sign-in already started.
            const pageShow = new Event("pageshow");
            Object.defineProperty(pageShow, "persisted", { value: true });
            window.dispatchEvent(pageShow);
            flushSync();

            expect(button.disabled).toBe(false);
            expect(button.textContent?.trim()).toBe("Sign in with your work account");
        });
    });

    describe("branding", () => {
        it("uses the logo and the background of the room", () => {
            render(
                gateState({
                    logo: "https://cdn.example.test/logo.svg",
                    backgroundImage: "https://cdn.example.test/background.webp",
                    backgroundColor: "#123456",
                }),
            );

            expect(byTestId("signInGateLogo")?.getAttribute("src")).toBe("https://cdn.example.test/logo.svg");
            expect(target.innerHTML).toContain("https://cdn.example.test/background.webp");
            // The browser engine writes #123456 as rgb(18, 52, 86).
            const tint = [...target.querySelectorAll<HTMLElement>("main > div[aria-hidden]")].find(
                (element) => element.style.backgroundColor !== "",
            );
            expect(tint?.style.backgroundColor).toBe("rgb(18, 52, 86)");
        });

        it("falls back to the WorkAdventure logo and background", () => {
            render(gateState());

            expect(byTestId("signInGateLogo")?.getAttribute("src")).toContain("logo.svg");
            expect(target.innerHTML).toContain("map-exemple.webp");
        });

        it("credits WorkAdventure only next to a custom logo, unless the room turned it off", () => {
            render(gateState({ logo: "https://cdn.example.test/logo.svg" }));
            expect(target.querySelector('img[alt="Powered by WorkAdventure"]')).not.toBeNull();
        });

        it("does not credit WorkAdventure when the room turned it off", () => {
            render(gateState({ logo: "https://cdn.example.test/logo.svg", showPoweredBy: false }));
            expect(target.querySelector('img[alt="Powered by WorkAdventure"]')).toBeNull();
        });
    });

    describe("legal links", () => {
        const legals: LegalsData = {
            termsOfUseUrl: "https://example.test/terms",
            privacyPolicyUrl: "https://example.test/privacy",
            cookiePolicyUrl: "https://example.test/cookies",
        };

        it("links the documents of the room in a sentence", () => {
            render(gateState({ legals }));

            const links = [...target.querySelectorAll<HTMLAnchorElement>('[data-testid="signInGateLegals"] a')];
            expect(links.map((link) => [link.textContent, link.href])).toEqual([
                ["terms of use", "https://example.test/terms"],
                ["privacy policy", "https://example.test/privacy"],
                ["cookie policy", "https://example.test/cookies"],
            ]);
            expect(links.every((link) => link.rel === "noopener noreferrer" && link.target === "_blank")).toBe(true);
            expect(byTestId("signInGateLegals")?.textContent).toMatch(/^By continuing, you agree to our .*\.$/);
        });

        it("shows nothing when the room has no legal documents", () => {
            render(gateState({ legals: undefined }));

            expect(byTestId("signInGateLegals")).toBeNull();
        });

        it("drops a link that is not a web address, as a javascript: link would run code", () => {
            render(
                gateState({
                    legals: { termsOfUseUrl: "javascript:alert(1)", privacyPolicyUrl: "https://example.test/privacy" },
                }),
            );

            const links = [...target.querySelectorAll<HTMLAnchorElement>('[data-testid="signInGateLegals"] a')];
            expect(links.map((link) => link.href)).toEqual(["https://example.test/privacy"]);
            expect(target.innerHTML).not.toContain("javascript:");
        });

        it("shows nothing when none of the links is a web address", () => {
            render(gateState({ legals: { termsOfUseUrl: "not a url", cookiePolicyUrl: "data:text/html,x" } }));

            expect(byTestId("signInGateLegals")).toBeNull();
        });
    });
});

describe("buildSignInGateState", () => {
    it("carries the sign-in page, the reason and the branding of the room", () => {
        const legals: LegalsData = { termsOfUseUrl: "https://example.test/terms" };

        const state = buildSignInGateState(
            {
                loginSceneLogo: "https://cdn.example.test/logo.svg",
                backgroundSceneImage: "https://cdn.example.test/background.webp",
                backgroundColor: "#123456",
                legals,
                showPoweredBy: false,
            },
            new URL(signInUrl),
            "sessionExpired",
        );

        expect(state).toEqual({
            signInUrl,
            reason: "sessionExpired",
            logo: "https://cdn.example.test/logo.svg",
            backgroundImage: "https://cdn.example.test/background.webp",
            backgroundColor: "#123456",
            legals,
            showPoweredBy: false,
        });
    });
});
