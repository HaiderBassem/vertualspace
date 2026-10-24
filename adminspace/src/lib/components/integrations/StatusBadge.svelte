<!-- Status of an integration: text and color (never color alone, WCAG 1.4.1). -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";

    type Status =
        "notConfigured" | "available" | "pending" | "connected" | "error" | "revoked" | "expired" | "not_configured";
    let { status }: { status: Status } = $props();
    const i18n = useI18n();
    const key = $derived(status === "not_configured" ? "available" : status);
    const tone = $derived(
        key === "connected"
            ? "badge-success"
            : key === "error" || key === "expired" || key === "revoked"
              ? "badge-danger"
              : key === "pending"
                ? "badge-warning"
                : key === "available"
                  ? "badge-accent"
                  : "",
    );
</script>

<span class="badge {tone}">{i18n.m.integrationCenter.status[key]}</span>
