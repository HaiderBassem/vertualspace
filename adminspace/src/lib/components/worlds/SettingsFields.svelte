<!-- Renders the fields of world settings groups described in settingsSections.ts. -->
<script lang="ts">
    import Field from "$lib/components/Field.svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import { fieldName, type GroupDescriptor } from "./settingsSections";

    type ErrorCode = keyof Messages["common"]["errors"];

    let {
        groups,
        values,
        secretsSet,
        canReadSecrets,
        errors = {},
    }: {
        groups: GroupDescriptor[];
        /** Current values as form strings, keyed by field name. */
        values: Record<string, string>;
        secretsSet: Record<string, boolean>;
        canReadSecrets: boolean;
        errors?: Record<string, ErrorCode>;
    } = $props();

    const i18n = useI18n();
    const s = $derived(i18n.m.worlds.settings);

    function label(group: string, prop: string): string {
        return (s.fields as Record<string, Record<string, string>>)[group]?.[prop] ?? prop;
    }
    function hint(group: string, prop: string): string | undefined {
        return (s.hints as Record<string, Record<string, string> | undefined>)[group]?.[prop];
    }
    function option(value: string): string {
        return (s.options as Record<string, string>)[value] ?? value;
    }
</script>

{#each groups as group (group.key)}
    <fieldset class="card space-y-5">
        <legend class="px-1 text-base font-bold">{(s.groups as Record<string, string>)[group.key]}</legend>
        {#each group.fields as field (field.prop)}
            {@const name = fieldName(group.key, field.prop)}
            {@const value = values[name] ?? ""}
            {@const fieldHint =
                hint(group.key, field.prop) ??
                (field.type === "list" ? s.listHint : field.type === "json" ? s.jsonHint : undefined)}
            {#if field.type === "secret"}
                <Field
                    label={label(group.key, field.prop)}
                    {name}
                    error={errors[name]}
                    hint={secretsSet[name] ? (canReadSecrets ? s.secretSet : s.secretHidden) : fieldHint}
                >
                    {#snippet children(a)}
                        <input
                            class="input font-mono"
                            {...a}
                            {name}
                            type="password"
                            autocomplete="off"
                            maxlength={field.max}
                            placeholder={secretsSet[name] ? "••••••••" : ""}
                        />
                    {/snippet}
                </Field>
                {#if secretsSet[name]}
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="{name}__clear" />
                        {s.secretClear}
                    </label>
                {/if}
            {:else}
                <Field label={label(group.key, field.prop)} {name} error={errors[name]} hint={fieldHint}>
                    {#snippet children(a)}
                        {#if field.type === "bool3"}
                            <select class="select" {...a} {name} {value}>
                                <option value="">{s.inherit}</option>
                                <option value="true">{s.on}</option>
                                <option value="false">{s.off}</option>
                            </select>
                        {:else if field.type === "select"}
                            <select class="select" {...a} {name} {value}>
                                <option value="">{s.inherit}</option>
                                {#each field.options ?? [] as opt (opt)}
                                    <option value={opt}>{option(opt)}</option>
                                {/each}
                            </select>
                        {:else if field.type === "list" || field.type === "json" || field.type === "textarea"}
                            <textarea
                                class="textarea {field.type === 'textarea' ? '' : 'font-mono'}"
                                rows={field.type === "json" ? 6 : 3}
                                {...a}
                                {name}
                                maxlength={field.max}>{value}</textarea
                            >
                        {:else if field.type === "color"}
                            <div class="flex items-center gap-2">
                                <input
                                    class="input font-mono"
                                    {...a}
                                    {name}
                                    {value}
                                    placeholder="#1E66F5"
                                    pattern={"#[0-9a-fA-F]{6}"}
                                />
                                {#if /^#[0-9a-fA-F]{6}$/.test(value)}
                                    <span
                                        class="inline-block h-8 w-8 shrink-0 rounded border border-[var(--border)]"
                                        style:background={value}
                                        aria-hidden="true"
                                    ></span>
                                {/if}
                            </div>
                        {:else if field.type === "number"}
                            <input
                                class="input"
                                type="number"
                                inputmode="numeric"
                                {...a}
                                {name}
                                {value}
                                min={field.min}
                                max={field.max}
                                step="1"
                            />
                        {:else}
                            <input
                                class="input"
                                type={field.type === "url" ? "url" : "text"}
                                {...a}
                                {name}
                                {value}
                                maxlength={field.max}
                                dir={field.type === "url" ? "ltr" : undefined}
                            />
                        {/if}
                    {/snippet}
                </Field>
            {/if}
        {/each}
    </fieldset>
{/each}
