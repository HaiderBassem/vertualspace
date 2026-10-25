<script lang="ts">
    import type { RoomTemplate } from "@workadventure/map-editor";
    import { ROOM_MIN_TILES } from "@workadventure/map-editor";
    import type { RoomShortDescription } from "@workadventure/messages";
    import { onDestroy, onMount } from "svelte";
    import type { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../../Api/ScriptUtils";
    import { roomCreationStatusStore } from "../../../Stores/RoomCreationStore";
    import { IconAlertTriangle, IconCheck, IconDoorIn, IconPlus } from "@wa-icons";
    import { connectionManager } from "../../../Connection/ConnectionManager";

    const scene = gameManager.getCurrentGameScene();
    const currentRoomPath = new URL(scene.roomUrl, window.location.href).pathname;

    let rooms = $state<RoomShortDescription[] | undefined>(undefined);
    let name = $state("");
    let template = $state<RoomTemplate>("blank");
    let addDoor = $state(true);
    let size = $state({ width: 20, height: 15 });

    // Meeting room, team room and open space sizes, in tiles.
    const sizes: { label: () => LocalizedString; width: number; height: number }[] = [
        { label: () => $LL.mapEditor.roomEditor.roomPresetSmall(), width: 12, height: 10 },
        { label: () => $LL.mapEditor.roomEditor.roomPresetMedium(), width: 20, height: 15 },
        { label: () => $LL.mapEditor.roomEditor.roomPresetLarge(), width: 32, height: 24 },
    ];

    const templates: { value: RoomTemplate; title: () => LocalizedString; help: () => LocalizedString }[] = [
        {
            value: "blank",
            title: () => $LL.mapEditor.roomEditor.templateBlank(),
            help: () => $LL.mapEditor.roomEditor.templateBlankHelp(),
        },
        {
            value: "copy",
            title: () => $LL.mapEditor.roomEditor.templateCopy(),
            help: () => $LL.mapEditor.roomEditor.templateCopyHelp(),
        },
    ];

    let busy = $derived($roomCreationStatusStore.state === "pending" || $roomCreationStatusStore.state === "linking");

    function isCurrentRoom(room: RoomShortDescription): boolean {
        return new URL(room.roomUrl, window.location.href).pathname === currentRoomPath;
    }

    async function loadRooms(): Promise<void> {
        const list = (await scene.connection?.queryRoomsFromSameWorld()) ?? [];
        rooms = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    let renaming = $state<{ roomUrl: string; name: string } | undefined>(undefined);
    let renameFailed = $state(false);

    async function saveRename(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        const current = renaming;
        const trimmed = current?.name.trim() ?? "";
        if (current === undefined || trimmed === "") {
            return;
        }
        try {
            await connectionManager.renameRoom(current.roomUrl, trimmed);
            renaming = undefined;
            renameFailed = false;
            await loadRooms();
        } catch (e) {
            console.error("Could not rename the room", e);
            renameFailed = true;
        }
    }

    function createRoom(event: SubmitEvent): void {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed === "" || busy) {
            return;
        }
        scene
            .getMapEditorModeManager()
            ?.requestRoomCreation(
                { name: trimmed, template, width: Math.max(ROOM_MIN_TILES, size.width), height: size.height },
                addDoor,
            );
    }

    // Once a room is created, the list shows it.
    const unsubscribe = roomCreationStatusStore.subscribe((status) => {
        if (status.state === "created") {
            name = "";
            loadRooms().catch((e) => console.error("Could not load the rooms of the world", e));
        }
    });

    onMount(() => {
        loadRooms().catch((e) => console.error("Could not load the rooms of the world", e));
    });

    onDestroy(() => {
        unsubscribe();
        if ($roomCreationStatusStore.state === "created" || $roomCreationStatusStore.state === "failed") {
            roomCreationStatusStore.set({ state: "idle" });
        }
    });
</script>

<div class="flex flex-col gap-4 text-white" data-testid="roomsEditor">
    <section class="flex flex-col gap-2">
        <h3 class="text-sm font-bold uppercase tracking-wide text-white/60 m-0">
            {$LL.mapEditor.roomEditor.roomsTitle()}
        </h3>
        {#if rooms === undefined}
            <p class="m-0 text-sm text-white/70">{$LL.mapEditor.roomEditor.roomsLoading()}</p>
        {:else if rooms.length === 0}
            <p class="m-0 text-sm text-white/70">{$LL.mapEditor.roomEditor.roomsEmpty()}</p>
        {:else}
            <ul class="m-0 flex list-none flex-col gap-1 p-0" data-testid="roomsList">
                {#each rooms as room (room.roomUrl)}
                    <li class="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2">
                        {#if renaming?.roomUrl === room.roomUrl}
                            <form class="flex w-full items-center gap-2" onsubmit={saveRename}>
                                <input
                                    class="min-w-0 flex-1 rounded-md bg-white/10 px-2 py-1 text-white"
                                    type="text"
                                    maxlength="200"
                                    aria-label={$LL.mapEditor.roomEditor.renameRoomLabel()}
                                    data-testid="renameRoomInput"
                                    bind:value={renaming.name}
                                />
                                <button type="submit" class="rounded-md bg-white/20 px-2 py-1 text-sm">
                                    {$LL.mapEditor.roomEditor.renameRoomSave()}
                                </button>
                                <button
                                    type="button"
                                    class="rounded-md bg-white/10 px-2 py-1 text-sm"
                                    onclick={() => {
                                        renaming = undefined;
                                        renameFailed = false;
                                    }}
                                >
                                    {$LL.mapEditor.roomEditor.renameRoomCancel()}
                                </button>
                            </form>
                            {#if renameFailed}
                                <p class="m-0 text-sm text-red-300" role="alert">
                                    {$LL.mapEditor.roomEditor.renameRoomFailed()}
                                </p>
                            {/if}
                        {:else}
                            <span class="truncate">{room.name}</span>
                            <button
                                type="button"
                                class="shrink-0 rounded-md bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
                                data-testid="renameRoomButton"
                                onclick={() => (renaming = { roomUrl: room.roomUrl, name: room.name })}
                            >
                                {$LL.mapEditor.roomEditor.renameRoom()}
                            </button>
                            {#if isCurrentRoom(room)}
                                <span class="shrink-0 text-xs text-white/60"
                                    >{$LL.mapEditor.roomEditor.currentRoom()}</span
                                >
                            {:else}
                                <button
                                    type="button"
                                    class="flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
                                    onclick={() => scriptUtils.goToPage(room.roomUrl)}
                                >
                                    <IconDoorIn font-size="16" />
                                    {$LL.mapEditor.roomEditor.goToRoom()}
                                </button>
                            {/if}
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <form class="flex flex-col gap-3" onsubmit={createRoom}>
        <h3 class="text-sm font-bold uppercase tracking-wide text-white/60 m-0">
            {$LL.mapEditor.roomEditor.addRoomTitle()}
        </h3>
        <label class="flex flex-col gap-1 text-sm">
            {$LL.mapEditor.roomEditor.roomName()}
            <input
                type="text"
                data-testid="newRoomName"
                class="rounded-md bg-white/10 px-3 py-2 text-white placeholder:text-white/40"
                placeholder={$LL.mapEditor.roomEditor.roomNamePlaceholder()}
                maxlength={100}
                required
                disabled={busy}
                bind:value={name}
            />
        </label>

        <div class="flex flex-col gap-2" role="radiogroup" aria-label={$LL.mapEditor.roomEditor.addRoomTitle()}>
            {#each templates as option (option.value)}
                <button
                    type="button"
                    role="radio"
                    aria-checked={template === option.value}
                    class="flex flex-col items-start rounded-lg border-2 p-2 text-start {template === option.value
                        ? 'border-secondary bg-secondary/40'
                        : 'border-transparent bg-white/10 hover:bg-white/20'}"
                    disabled={busy}
                    onclick={() => (template = option.value)}
                >
                    <span class="font-bold">{option.title()}</span>
                    <span class="text-xs text-white/70">{option.help()}</span>
                </button>
            {/each}
        </div>

        {#if template === "blank"}
            <div class="flex flex-col gap-1">
                <span class="text-sm">{$LL.mapEditor.roomEditor.roomSize()}</span>
                <div class="grid grid-cols-3 gap-2">
                    {#each sizes as option (option.width)}
                        <button
                            type="button"
                            class="flex flex-col items-center rounded-lg p-2 {size.width === option.width
                                ? 'bg-secondary'
                                : 'bg-white/10 hover:bg-white/20'}"
                            disabled={busy}
                            onclick={() => (size = { width: option.width, height: option.height })}
                        >
                            <span class="font-bold">{option.label()}</span>
                            <span class="text-xs text-white/70">{option.width} × {option.height}</span>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <label class="flex items-start gap-2 text-sm">
            <input type="checkbox" class="mt-1" disabled={busy} bind:checked={addDoor} />
            <span class="flex flex-col">
                {$LL.mapEditor.roomEditor.addDoor()}
                <span class="text-xs text-white/60">{$LL.mapEditor.roomEditor.addDoorHelp()}</span>
            </span>
        </label>

        <div aria-live="polite" class="flex flex-col gap-2 text-sm">
            {#if $roomCreationStatusStore.state === "linking"}
                <p class="m-0 text-white/70">{$LL.mapEditor.roomEditor.linkingRoom()}</p>
            {:else if $roomCreationStatusStore.state === "created"}
                {@const created = $roomCreationStatusStore}
                <p class="m-0 flex items-start gap-2 text-success-400" data-testid="roomCreated">
                    <IconCheck font-size="18" class="shrink-0" />
                    {$LL.mapEditor.roomEditor.roomCreated({ name: created.name })}
                    {#if created.doorAdded}
                        {$LL.mapEditor.roomEditor.roomCreatedDoor()}
                    {/if}
                </p>
                {#if created.roomUrl === undefined}
                    <p class="m-0 flex items-start gap-2 text-warning-400">
                        <IconAlertTriangle font-size="18" class="shrink-0" />
                        {$LL.mapEditor.roomEditor.roomCreatedNotListed()}
                    </p>
                {/if}
            {:else if $roomCreationStatusStore.state === "failed"}
                <p class="m-0 flex items-start gap-2 text-danger-400" role="alert">
                    <IconAlertTriangle font-size="18" class="shrink-0" />
                    {$LL.mapEditor.roomEditor.roomCreationFailed({ reason: $roomCreationStatusStore.reason })}
                </p>
            {/if}
        </div>

        <button
            type="submit"
            data-testid="createRoom"
            class="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 font-bold hover:bg-secondary-600 disabled:opacity-50"
            disabled={busy || name.trim() === ""}
        >
            <IconPlus font-size="18" />
            {#if $roomCreationStatusStore.state === "pending"}
                {$LL.mapEditor.roomEditor.creatingRoom()}
            {:else}
                {$LL.mapEditor.roomEditor.createRoom()}
            {/if}
        </button>
    </form>
</div>
