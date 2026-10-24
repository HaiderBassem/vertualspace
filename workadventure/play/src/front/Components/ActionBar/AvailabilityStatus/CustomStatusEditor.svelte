<script lang="ts">
    import type { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { myCustomStatusStore } from "../../../Stores/CustomStatusStore";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import type { CustomStatusDuration } from "../../../Utils/CustomStatus";
    import {
        CUSTOM_STATUS_MAX_TEXT_LENGTH,
        CustomStatusDuration as CustomStatusDurationSchema,
        customStatusExpiry,
        formatCustomStatus,
    } from "../../../Utils/CustomStatus";
    import HeaderMenuItem from "../MenuIcons/HeaderMenuItem.svelte";
    import { IconX } from "@wa-icons";

    // Gather-like quick statuses: one click fills the form, with a sensible duration.
    const presets: { emoji: string; label: () => LocalizedString; duration: CustomStatusDuration }[] = [
        { emoji: "📅", label: () => $LL.customStatus.presets.meeting(), duration: "1h" },
        { emoji: "🚌", label: () => $LL.customStatus.presets.commuting(), duration: "30m" },
        { emoji: "🤒", label: () => $LL.customStatus.presets.sick(), duration: "today" },
        { emoji: "🌴", label: () => $LL.customStatus.presets.vacation(), duration: "week" },
        { emoji: "🏠", label: () => $LL.customStatus.presets.remote(), duration: "today" },
        { emoji: "🎧", label: () => $LL.customStatus.presets.focus(), duration: "1h" },
    ];
    const durations = CustomStatusDurationSchema.options;

    let editing = $state(false);
    let emoji = $state("💬");
    let text = $state("");
    let duration = $state<CustomStatusDuration>("today");

    function startEditing(): void {
        emoji = $myCustomStatusStore?.emoji || "💬";
        text = $myCustomStatusStore?.text ?? "";
        duration = "today";
        editing = true;
    }

    function save(event: SubmitEvent): void {
        event.preventDefault();
        const trimmedText = text.trim().slice(0, CUSTOM_STATUS_MAX_TEXT_LENGTH);
        const trimmedEmoji = [...emoji.trim()].slice(0, 4).join("");
        gameManager
            .getCurrentGameScene()
            .setMyCustomStatus(
                trimmedText === "" && trimmedEmoji === ""
                    ? undefined
                    : { emoji: trimmedEmoji, text: trimmedText, expiresAt: customStatusExpiry(duration) },
            );
        editing = false;
        inputFormFocusStore.set(false);
    }

    function clear(): void {
        gameManager.getCurrentGameScene().setMyCustomStatus(undefined);
        editing = false;
        inputFormFocusStore.set(false);
    }

    const onFocus = () => inputFormFocusStore.set(true);
    const onBlur = () => inputFormFocusStore.set(false);
</script>

<div data-testid="custom-status">
    <HeaderMenuItem label={$LL.customStatus.title()} />
    {#if !editing}
        <div class="flex items-center gap-1 px-2 py-1">
            <button
                type="button"
                class="grow truncate rounded px-1 py-1 text-start text-sm text-neutral-100 hover:bg-white/10"
                data-testid="custom-status-open"
                onclick={(event) => {
                    event.stopPropagation();
                    startEditing();
                }}
            >
                {$myCustomStatusStore ? formatCustomStatus($myCustomStatusStore) : $LL.customStatus.set()}
            </button>
            {#if $myCustomStatusStore}
                <button
                    type="button"
                    class="rounded p-1 hover:bg-white/10"
                    aria-label={$LL.customStatus.clear()}
                    title={$LL.customStatus.clear()}
                    onclick={(event) => {
                        event.stopPropagation();
                        clear();
                    }}
                >
                    <IconX font-size="14" />
                </button>
            {/if}
        </div>
    {:else}
        <form class="flex flex-col gap-2 px-2 py-1 text-sm" onsubmit={save}>
            <div class="flex flex-col gap-0.5">
                {#each presets as preset (preset.emoji)}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded px-1 py-0.5 text-start hover:bg-white/10"
                        onclick={(event) => {
                            event.stopPropagation();
                            emoji = preset.emoji;
                            text = preset.label();
                            duration = preset.duration;
                        }}
                    >
                        <span aria-hidden="true">{preset.emoji}</span>
                        <span class="grow truncate">{preset.label()}</span>
                        <span class="text-xs text-white/50">{$LL.customStatus.durations[preset.duration]()}</span>
                    </button>
                {/each}
            </div>
            <div class="flex gap-1">
                <input
                    class="w-10 rounded bg-white/10 px-1 py-1 text-center"
                    aria-label={$LL.customStatus.emojiLabel()}
                    maxlength={16}
                    bind:value={emoji}
                    onfocus={onFocus}
                    onblur={onBlur}
                />
                <input
                    class="min-w-0 grow rounded bg-white/10 px-2 py-1 placeholder:text-white/40"
                    data-testid="custom-status-text"
                    aria-label={$LL.customStatus.textLabel()}
                    placeholder={$LL.customStatus.textPlaceholder()}
                    maxlength={CUSTOM_STATUS_MAX_TEXT_LENGTH}
                    bind:value={text}
                    onfocus={onFocus}
                    onblur={onBlur}
                />
            </div>
            <label class="flex items-center justify-between gap-2 text-xs text-white/70">
                {$LL.customStatus.durationLabel()}
                <select class="rounded bg-contrast px-1 py-0.5 text-sm text-white" bind:value={duration}>
                    {#each durations as option (option)}
                        <option value={option}>{$LL.customStatus.durations[option]()}</option>
                    {/each}
                </select>
            </label>
            <div class="flex justify-end gap-1">
                <button
                    type="button"
                    class="rounded px-2 py-1 hover:bg-white/10"
                    onclick={(event) => {
                        event.stopPropagation();
                        editing = false;
                        inputFormFocusStore.set(false);
                    }}
                >
                    {$LL.customStatus.cancel()}
                </button>
                <button
                    type="submit"
                    class="rounded bg-secondary px-3 py-1 font-bold hover:bg-secondary-600"
                    data-testid="custom-status-save"
                >
                    {$LL.customStatus.save()}
                </button>
            </div>
        </form>
    {/if}
</div>
