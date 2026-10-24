<!--
    A labelled form field. Wires label, hint and error to the control for assistive technologies
    (WCAG 2.2: 1.3.1 Info and relationships, 3.3.1 Error identification, 3.3.2 Labels or instructions).

    <Field label="Name" name="name" error={form?.errors?.name}>
        {#snippet children(a)}<input class="input" {...a} name="name" />{/snippet}
    </Field>
-->
<script lang="ts">
    import type { Snippet } from "svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";

    interface ControlAttributes {
        id: string;
        "aria-describedby": string | undefined;
        "aria-invalid": "true" | undefined;
        required: boolean;
    }

    let {
        label,
        name,
        error = undefined,
        hint = undefined,
        required = false,
        children,
    }: {
        label: string;
        name: string;
        error?: keyof Messages["common"]["errors"] | undefined;
        hint?: string | undefined;
        required?: boolean;
        children: Snippet<[ControlAttributes]>;
    } = $props();

    const i18n = useI18n();
    const id = $derived(`field-${name}`);
    const describedBy = $derived(
        [hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined,
    );
</script>

<div class="field">
    <label class="label" for={id}>
        {label}
        {#if !required}<span class="muted font-normal">({i18n.m.common.labels.optional})</span>{/if}
    </label>
    {@render children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
        required,
    })}
    {#if hint}<p class="hint" id="{id}-hint">{hint}</p>{/if}
    {#if error}<p class="field-error" id="{id}-error">{i18n.m.common.errors[error]}</p>{/if}
</div>
