<!-- How a resize fills new space: extend the room (walls stay at the edges) or add empty space. Posts `fill`. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import { RESIZE_FILLS, type ResizeFill } from "$lib/rooms/size";

    let { fill = $bindable(), name = "fill" }: { fill: ResizeFill; name?: string } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);
</script>

<fieldset class="space-y-2">
    <legend class="label">{o.size.fill}</legend>
    {#each RESIZE_FILLS as value (value)}
        <label class="choice">
            <input type="radio" {name} {value} bind:group={fill} class="mt-1" />
            <span>
                <span class="block font-semibold">{o.fills[value].label}</span>
                <span class="muted block text-sm">{o.fills[value].hint}</span>
            </span>
        </label>
    {/each}
</fieldset>
