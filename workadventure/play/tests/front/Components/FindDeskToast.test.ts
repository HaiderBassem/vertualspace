import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import FindDeskToast from "../../../src/front/Components/Toasts/FindDeskToast.svelte";

const { removeToast } = vi.hoisted(() => ({ removeToast: vi.fn() }));

vi.mock("../../../src/front/Stores/ToastStoreSingleton", () => ({ toastStore: { removeToast } }));
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            area: {
                personalArea: {
                    welcome: {
                        title: () => "You do not have a desk yet",
                        description: () => "Take a free desk and make it yours.",
                        findDesk: () => "Find me a desk",
                        later: () => "Not now",
                    },
                },
            },
        }),
    };
});

describe("FindDeskToast", () => {
    const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

    beforeAll(() => {
        // jsdom has no Web Animations API, which the fly-in transition of the toast container needs.
        Object.defineProperty(Element.prototype, "animate", {
            configurable: true,
            writable: true,
            value: vi.fn(() => ({
                cancel: vi.fn(),
                finish: vi.fn(),
                onfinish: null,
                currentTime: 0,
                finished: Promise.resolve(),
            })),
        });
    });

    afterAll(() => {
        if (originalAnimate) {
            Object.defineProperty(Element.prototype, "animate", originalAnimate);
        } else {
            Reflect.deleteProperty(Element.prototype, "animate");
        }
    });

    let target: HTMLElement;
    let component: ReturnType<typeof mount> | undefined;
    let onFind: ReturnType<typeof vi.fn<() => void>>;
    let onLater: ReturnType<typeof vi.fn<() => void>>;

    function render(toastUuid: string): void {
        flushSync(() => {
            component = mount(FindDeskToast, { target, props: { toastUuid, onFind, onLater } });
        });
    }

    function byTestId(id: string): HTMLElement | null {
        return target.querySelector(`[data-testid="${id}"]`);
    }

    beforeEach(() => {
        vi.clearAllMocks();
        target = document.createElement("div");
        document.body.append(target);
        onFind = vi.fn<() => void>();
        onLater = vi.fn<() => void>();
    });

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted);
        target.remove();
    });

    it("tells the newcomer they have no desk and offers to find one or to leave it", () => {
        render("toast-1");

        expect(byTestId("findDeskTitle")?.textContent?.trim()).toBe("You do not have a desk yet");
        expect(byTestId("findDeskDescription")?.textContent?.trim()).toBe("Take a free desk and make it yours.");
        expect(byTestId("findDeskButton")?.textContent?.trim()).toBe("Find me a desk");
        expect(byTestId("findDeskLaterButton")?.textContent?.trim()).toBe("Not now");
    });

    it("goes away and finds a desk when accepted", () => {
        render("toast-7");

        byTestId("findDeskButton")?.click();

        expect(onFind).toHaveBeenCalledOnce();
        expect(onLater).not.toHaveBeenCalled();
        expect(removeToast).toHaveBeenCalledExactlyOnceWith("toast-7");
    });

    it("goes away and does nothing else when put off", () => {
        render("toast-8");

        byTestId("findDeskLaterButton")?.click();

        expect(onLater).toHaveBeenCalledOnce();
        expect(onFind).not.toHaveBeenCalled();
        expect(removeToast).toHaveBeenCalledExactlyOnceWith("toast-8");
    });
});
