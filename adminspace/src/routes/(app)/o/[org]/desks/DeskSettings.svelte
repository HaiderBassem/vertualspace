<!--
    The settings of one desk: its name, how it is used (personal, hot, shared: a change that takes the desk from people
    is confirmed in a dialog that says who), who can claim it, who it is open to (tags), its co-owners when it is
    shared, and removing it when it belongs to nobody and nobody has it reserved.
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import { useI18n } from "$lib/i18n/context";
    import { DESK_TYPES, type DeskType } from "$lib/desks/model";
    import { holderCount, isAbout, liveReservations, ownerName, tracked, type DeskRow, type Feedback } from "./ui";

    let {
        roomId,
        desk,
        worldTags,
        feedback,
    }: { roomId: string; desk: DeskRow; worldTags: string[]; feedback: Feedback | null } = $props();

    const i18n = useI18n();
    const d = $derived(i18n.m.desks);
    const ids = $derived(`settings-${roomId}-${desk.id}`);
    const open = $derived(
        isAbout(feedback, roomId, desk.id, ["rename", "claim", "type", "coOwners", "tags", "remove"]),
    );
    const live = $derived(liveReservations(desk));
    const removable = $derived(holderCount(desk) === 0 && live.length === 0);
    const otherTypes = $derived(DESK_TYPES.filter((type) => type !== desk.deskType));

    let renaming = $state(false);
    let claiming = $state(false);
    let tagging = $state(false);
    let sharing = $state(false);

    /** Becoming a hot desk takes it from its owner. */
    const clearsOwner = (type: DeskType) => type === "hot" && desk.ownerId !== null;
    /** No longer being shared takes it from its co-owners. */
    const dropsCoOwners = (type: DeskType) =>
        desk.deskType === "shared" && type !== "shared" && desk.coOwners.length > 0;

    /** What the dialog says about a change of type: what the desk becomes, and who loses it. */
    function consequences(type: DeskType): string {
        return [
            d.typeHint[type],
            clearsOwner(type) ? i18n.t(d.deskType.clearsOwner, { person: ownerName(desk) }) : "",
            dropsCoOwners(type) ? i18n.p(d.deskType.dropsCoOwners, desk.coOwners.length) : "",
        ]
            .filter((sentence) => sentence !== "")
            .join(" ");
    }
</script>

<details {open}>
    <summary class="cursor-pointer text-sm">
        {d.actions.settings}<span class="sr-only"> ({desk.name})</span>
    </summary>
    <div class="mt-2 flex flex-col gap-4">
        <form
            method="POST"
            action="?/rename"
            use:enhance={tracked((on) => (renaming = on))}
            class="flex flex-wrap items-center gap-2"
        >
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="deskId" value={desk.id} />
            <input type="hidden" name="deskName" value={desk.name} />
            <label class="sr-only" for="{ids}-name">{i18n.t(d.actions.renameLabel, { desk: desk.name })}</label>
            <input
                id="{ids}-name"
                class="input min-w-40 flex-1"
                name="name"
                value={desk.name}
                maxlength="200"
                required
            />
            <button type="submit" class="btn btn-sm" disabled={renaming} aria-busy={renaming}>
                {renaming ? d.saving : d.actions.rename}
            </button>
        </form>

        <section class="flex flex-col gap-2" aria-labelledby="{ids}-type">
            <h4 id="{ids}-type" class="text-sm font-medium">{d.deskType.title}</h4>
            <p class="text-xs">
                <span class="font-medium">{d.type[desk.deskType]}</span>
                <span class="muted">· {d.typeHint[desk.deskType]}</span>
            </p>
            <div class="flex flex-wrap gap-2">
                {#each otherTypes as type (type)}
                    <ConfirmForm
                        action="?/type"
                        label={d.deskType.make[type]}
                        title={i18n.t(d.deskType.confirmTitle[type], { desk: desk.name })}
                        description={consequences(type)}
                        fields={{
                            roomId,
                            deskId: desk.id,
                            deskName: desk.name,
                            deskType: type,
                            ...(clearsOwner(type) ? { clearOwner: "1" } : {}),
                            ...(dropsCoOwners(type) ? { dropCoOwners: "1" } : {}),
                        }}
                        danger={clearsOwner(type) || dropsCoOwners(type)}
                        small
                    />
                {/each}
            </div>
        </section>

        {#if desk.deskType === "assigned"}
            <form
                method="POST"
                action="?/claim"
                use:enhance={tracked((on) => (claiming = on))}
                class="flex flex-wrap items-center gap-2"
            >
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="deskId" value={desk.id} />
                <input type="hidden" name="deskName" value={desk.name} />
                <label class="sr-only" for="{ids}-mode">{i18n.t(d.actions.claimLabel, { desk: desk.name })}</label>
                <select id="{ids}-mode" class="input min-w-40 flex-1" name="mode">
                    <option value="dynamic" selected={desk.claimMode === "dynamic"}>{d.table.dynamic}</option>
                    <option value="static" selected={desk.claimMode === "static"}>{d.table.static}</option>
                </select>
                <button type="submit" class="btn btn-sm" disabled={claiming} aria-busy={claiming}>
                    {claiming ? d.saving : d.actions.setClaim}
                </button>
            </form>
        {/if}

        <form method="POST" action="?/tags" use:enhance={tracked((on) => (tagging = on))} class="flex flex-col gap-1">
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="deskId" value={desk.id} />
            <input type="hidden" name="deskName" value={desk.name} />
            <label class="label" for="{ids}-tags">{i18n.t(d.tags.label, { desk: desk.name })}</label>
            <div class="flex flex-wrap items-center gap-2">
                <input
                    id="{ids}-tags"
                    class="input min-w-40 flex-1"
                    name="tags"
                    value={desk.allowedTags.join(", ")}
                    maxlength="2000"
                    autocomplete="off"
                    aria-describedby="{ids}-tags-hint"
                />
                <button type="submit" class="btn btn-sm" disabled={tagging} aria-busy={tagging}>
                    {tagging ? d.saving : d.tags.save}
                </button>
            </div>
            <p id="{ids}-tags-hint" class="hint">
                {d.tags.hint}
                {#if worldTags.length > 0}{i18n.t(d.tags.known, { tags: worldTags.join(", ") })}{/if}
            </p>
        </form>

        {#if desk.deskType === "shared"}
            <form
                method="POST"
                action="?/coOwners"
                use:enhance={tracked((on) => (sharing = on))}
                class="flex flex-col gap-1"
            >
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="deskId" value={desk.id} />
                <input type="hidden" name="deskName" value={desk.name} />
                <label class="label" for="{ids}-co-owners">{i18n.t(d.coOwners.label, { desk: desk.name })}</label>
                <textarea
                    id="{ids}-co-owners"
                    class="input font-mono text-sm"
                    name="coOwners"
                    rows="3"
                    maxlength="20000"
                    aria-describedby="{ids}-co-owners-hint"
                    value={desk.coOwners.map((coOwner) => coOwner.id).join("\n")}></textarea>
                <p id="{ids}-co-owners-hint" class="hint">
                    {d.coOwners.hint}
                    {#if desk.coOwners.length === 0}{d.coOwners.none}{/if}
                </p>
                {#if live.length > 0}
                    <label class="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="cancelReservations" value="1" />
                        {i18n.p(d.actions.cancelReservations, live.length)}
                    </label>
                {/if}
                <div>
                    <button type="submit" class="btn btn-sm" disabled={sharing} aria-busy={sharing}>
                        {sharing ? d.saving : d.coOwners.save}
                    </button>
                </div>
            </form>
        {/if}

        {#if removable}
            <div>
                <ConfirmForm
                    action="?/remove"
                    label={d.actions.remove}
                    title={i18n.t(d.confirm.removeTitle, { desk: desk.name })}
                    description={d.confirm.removeBody}
                    fields={{ roomId, deskId: desk.id, deskName: desk.name }}
                    small
                />
            </div>
        {/if}
    </div>
</details>
