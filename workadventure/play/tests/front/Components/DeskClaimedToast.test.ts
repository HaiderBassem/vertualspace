import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import DeskClaimedToast from "../../../src/front/Components/Toasts/DeskClaimedToast.svelte";

const { removeToast } = vi.hoisted(() => ({ removeToast: vi.fn() }));

vi.mock("../../../src/front/Stores/ToastStoreSingleton", () => ({ toastStore: { removeToast } }));
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            area: {
                personalArea: {
                    claimed: {
                        title: () => "Your desk is ready",
                        description: () => "It is yours now. Drag objects onto it.",
                    },
                },
            },
            actionbar: { personalDesk: { decorate: () => "Decorate my desk" } },
        }),
    };
});

describe("DeskClaimedToast", () => {
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
    let onDecorate: ReturnType<typeof vi.fn<() => void>>;

    function render(toastUuid: string): void {
        flushSync(() => {
            component = mount(DeskClaimedToast, { target, props: { toastUuid, onDecorate } });
        });
    }

    function byTestId(id: string): HTMLElement | null {
        return target.querySelector(`[data-testid="${id}"]`);
    }

    beforeEach(() => {
        vi.clearAllMocks();
        target = document.createElement("div");
        document.body.append(target);
        onDecorate = vi.fn<() => void>();
    });

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted);
        target.remove();
    });

    it("tells the new owner that the desk is theirs and what to do with it", () => {
        render("toast-1");

        expect(byTestId("deskClaimedTitle")?.textContent?.trim()).toBe("Your desk is ready");
        expect(byTestId("deskClaimedDescription")?.textContent?.trim()).toBe("It is yours now. Drag objects onto it.");
        expect(byTestId("decorateDeskButton")?.textContent?.trim()).toBe("Decorate my desk");
    });

    it("starts decorating and goes away when the button is clicked", () => {
        render("toast-42");

        byTestId("decorateDeskButton")?.click();

        expect(onDecorate).toHaveBeenCalledOnce();
        expect(removeToast).toHaveBeenCalledExactlyOnceWith("toast-42");
    });
});
