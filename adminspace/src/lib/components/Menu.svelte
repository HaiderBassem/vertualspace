<!--
    Disclosure menu: a button that shows a panel of links or buttons (WAI-ARIA disclosure pattern).
    Escape closes and returns focus to the button, a click outside closes, arrow keys move between
    the items. Items are plain <a>/<button> elements with class "popover-item".
-->
<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        label,
        trigger,
        children,
        align = "start",
        placement = "below",
        triggerClass = "btn btn-sm",
        panelClass = "",
    }: {
        /** Purpose of the button, read after its visible content by assistive technologies. */
        label: string;
        trigger: Snippet;
        children: Snippet<[{ close: () => void }]>;
        align?: "start" | "end";
        placement?: "below" | "above";
        triggerClass?: string;
        panelClass?: string;
    } = $props();

    const id = $props.id();
    let open = $state(false);
    let root: HTMLDivElement | undefined = $state();
    let button: HTMLButtonElement | undefined = $state();
    let panel: HTMLDivElement | undefined = $state();

    function close(focusButton = false) {
        open = false;
        if (focusButton) button?.focus();
    }

    function items(): HTMLElement[] {
        return panel ? [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")] : [];
    }

    function onKeydown(event: KeyboardEvent) {
        if (!open) return;
        if (event.key === "Escape") {
            event.preventDefault();
            close(true);
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const list = items();
            if (list.length === 0) return;
            const index = list.indexOf(document.activeElement as HTMLElement);
            const next =
                event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
            list[next]?.focus();
        }
    }

    $effect(() => {
        if (!open) return;
        const onPointer = (event: PointerEvent) => {
            if (root && !root.contains(event.target as Node)) close();
        };
        document.addEventListener("pointerdown", onPointer);
        return () => document.removeEventListener("pointerdown", onPointer);
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative" bind:this={root} onkeydown={onKeydown}>
    <button
        bind:this={button}
        type="button"
        class={triggerClass}
        aria-expanded={open}
        aria-controls="{id}-panel"
        onclick={() => (open = !open)}
    >
        {@render trigger()}
        <!-- The purpose, after the visible text: the accessible name keeps what people see (WCAG 2.5.3). -->
        <span class="sr-only">{label}</span>
    </button>
    <div
        bind:this={panel}
        id="{id}-panel"
        class="popover {align === 'end' ? 'end-0' : 'start-0'} {placement === 'above'
            ? 'bottom-full mb-2'
            : 'top-full mt-2'} {panelClass}"
        hidden={!open}
    >
        {@render children({ close: () => close() })}
    </div>
</div>
