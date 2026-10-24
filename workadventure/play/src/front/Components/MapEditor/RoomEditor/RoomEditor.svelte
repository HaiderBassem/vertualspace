<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";
    import RoomSizeEditor from "./RoomSizeEditor.svelte";
    import RoomsEditor from "./RoomsEditor.svelte";

    let tab = $state<"size" | "rooms">("size");
</script>

<div class="flex h-full flex-col gap-3 overflow-y-auto">
    <div class="grid grid-cols-2 gap-1 rounded-lg bg-white/10 p-1 text-white" role="tablist">
        {#each [{ value: "size" as const, label: $LL.mapEditor.roomEditor.tabSize() }, { value: "rooms" as const, label: $LL.mapEditor.roomEditor.tabRooms() }] as option (option.value)}
            <button
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                data-testid={`roomEditorTab-${option.value}`}
                class="rounded-md px-3 py-1 text-sm font-bold {tab === option.value
                    ? 'bg-secondary'
                    : 'hover:bg-white/10'}"
                onclick={() => (tab = option.value)}
            >
                {option.label}
            </button>
        {/each}
    </div>
    {#if tab === "size"}
        <RoomSizeEditor />
    {:else}
        <RoomsEditor />
    {/if}
</div>
