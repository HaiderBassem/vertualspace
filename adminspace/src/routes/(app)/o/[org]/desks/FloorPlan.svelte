<!--
    The floor plan of a room: each desk where it is on the map, drawn by its state (who it belongs to, whether it is
    reserved now, out of service), with the seats drawn on the map, and a legend. Each desk is a link to its row of the
    table, named with its state and who it is for; the drawing itself is decorative for screen readers.
-->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import { DESK_STATUSES, type DeskStatus } from "$lib/desks/model";
    import { DOUBLE_OUTLINE, planStyle, ownerName, reservedFor, type DeskRow, type RoomView } from "./ui";

    let { view, rowId }: { view: RoomView; rowId: (desk: DeskRow) => string } = $props();

    const i18n = useI18n();
    const d = $derived(i18n.m.desks);
    const hatchId = $derived(`desk-kept-${view.room.id}`);

    const frame = $derived.by(() => {
        if (view.map) return { width: view.map.widthPx, height: view.map.heightPx };
        const width = Math.max(64, ...view.desks.map((desk) => desk.x + desk.width)) + 32;
        const height = Math.max(64, ...view.desks.map((desk) => desk.y + desk.height)) + 32;
        return { width, height };
    });

    /** The states shown on this plan, in the order of the legend. */
    const shownStatuses = $derived(DESK_STATUSES.filter((status) => view.desks.some((desk) => desk.status === status)));
    const hasSeats = $derived(view.desks.some((desk) => desk.seats.length > 0));

    /**
     * What fits in a desk on the plan. It is always part of the desk's name, never an ellipsis, because the link's
     * accessible name ("Desk 12: Available") has to contain the words that are shown (WCAG 2.5.3, Label in Name): a long
     * name is cut to its number, or else to its first word.
     */
    function planLabel(name: string): string {
        if (name.length <= 9) return name;
        const number = /\d+\s*$/.exec(name)?.[0].trim();
        return number ?? (name.split(/\s+/)[0] ?? name).slice(0, 9);
    }

    /**
     * The size of the label of a desk: about a quarter of the desk, but small enough for the label to fit inside it (and
     * inside the inner outline of a shared desk). Characters are taken as 0.6 em wide, which holds for the UI font.
     */
    function labelSize(desk: DeskRow): number {
        const room = desk.width - (DOUBLE_OUTLINE.has(desk.status) ? 18 : 8);
        const fitting = room / (Math.max(1, planLabel(desk.name).length) * 0.6);
        return Math.max(8, Math.min(Math.min(desk.width, desk.height) * 0.28, fitting));
    }

    /** "Desk 12: Reserved now, for Alice until 6:00 PM": what the link to a desk says. */
    function describe(desk: DeskRow): string {
        const status = d.status[desk.status];
        if (desk.status === "kept") {
            const now = desk.reservations.find((reservation) => reservation.phase === "active");
            if (now) {
                return i18n.t(d.plan.deskKept, {
                    desk: desk.name,
                    status,
                    person: reservedFor(now),
                    end: i18n.dateTime(now.end),
                });
            }
        }
        if (desk.ownerId !== null) {
            return i18n.t(d.plan.deskOf, { desk: desk.name, status, person: ownerName(desk) });
        }
        return i18n.t(d.plan.desk, { desk: desk.name, status });
    }

    /** A short stroke from the centre of a seat towards where the person sitting faces. */
    function facing(direction: string, x: number, y: number, length: number): { x2: number; y2: number } {
        switch (direction) {
            case "Up":
                return { x2: x, y2: y - length };
            case "Down":
                return { x2: x, y2: y + length };
            case "Left":
                return { x2: x - length, y2: y };
            default:
                return { x2: x + length, y2: y };
        }
    }

    const seatRadius = $derived(
        Math.max(4, Math.min(12, ...view.desks.map((desk) => Math.min(desk.width, desk.height) * 0.12))),
    );

    function swatch(status: DeskStatus): string {
        return planStyle(status, hatchId, 2);
    }
</script>

<figure class="mb-5">
    <svg
        viewBox="0 0 {frame.width} {frame.height}"
        role="group"
        aria-label={i18n.t(d.plan.label, { room: view.room.name })}
        class="max-h-96 w-full rounded-[var(--radius)] border border-[var(--border)]"
        preserveAspectRatio="xMidYMid meet"
    >
        <defs>
            <pattern id={hatchId} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                <rect width="10" height="10" style="fill: var(--warning-soft);" />
                <line x1="0" y1="0" x2="0" y2="10" style="stroke: var(--warning); stroke-width: 4; opacity: 0.45;" />
            </pattern>
        </defs>
        <rect width={frame.width} height={frame.height} style="fill: var(--surface-sunken);" />
        {#each view.desks as desk (desk.id)}
            {@const label = describe(desk)}
            <a href="#{rowId(desk)}" aria-label={label}>
                <rect
                    x={desk.x}
                    y={desk.y}
                    width={desk.width}
                    height={desk.height}
                    rx="6"
                    style={planStyle(desk.status, hatchId)}
                />
                {#if DOUBLE_OUTLINE.has(desk.status) && desk.width > 16 && desk.height > 16}
                    <rect
                        x={desk.x + 6}
                        y={desk.y + 6}
                        width={desk.width - 12}
                        height={desk.height - 12}
                        rx="3"
                        style="fill: none; stroke: var(--accent); stroke-width: 1.5;"
                    />
                {/if}
                <text
                    x={desk.x + desk.width / 2}
                    y={desk.y + desk.height / 2}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    style="fill: var(--text); font-size: {labelSize(desk)}px;"
                >
                    {planLabel(desk.name)}
                </text>
                <title>{label}</title>
            </a>
            {#each desk.seats as seat, index (index)}
                {@const tip = facing(seat.direction, seat.x, seat.y, seatRadius * 1.8)}
                <g aria-hidden="true">
                    <circle
                        cx={seat.x}
                        cy={seat.y}
                        r={seatRadius}
                        style="fill: var(--surface); stroke: var(--text-subtle); stroke-width: 2;"
                    />
                    <line
                        x1={seat.x}
                        y1={seat.y}
                        x2={tip.x2}
                        y2={tip.y2}
                        style="stroke: var(--text-subtle); stroke-width: 2; stroke-linecap: round;"
                    />
                </g>
            {/each}
        {/each}
    </svg>
    <figcaption class="mt-2 text-xs">
        <p class="muted">
            {d.plan.hint}
            {#if !view.map}{d.plan.noSize}{/if}
        </p>
        <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label={d.plan.legend}>
            {#each shownStatuses as status (status)}
                <li class="flex items-center gap-1.5">
                    <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true" class="shrink-0">
                        <rect x="1.5" y="1.5" width="27" height="15" rx="3" style={swatch(status)} />
                        {#if DOUBLE_OUTLINE.has(status)}
                            <rect
                                x="5"
                                y="5"
                                width="20"
                                height="8"
                                rx="1.5"
                                style="fill: none; stroke: var(--accent); stroke-width: 1;"
                            />
                        {/if}
                    </svg>
                    <span>{d.status[status]}</span>
                </li>
            {/each}
            {#if hasSeats}
                <li class="flex items-center gap-1.5">
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" class="shrink-0">
                        <circle
                            cx="9"
                            cy="11"
                            r="5"
                            style="fill: var(--surface); stroke: var(--text-subtle); stroke-width: 2;"
                        />
                        <line
                            x1="9"
                            y1="11"
                            x2="9"
                            y2="2"
                            style="stroke: var(--text-subtle); stroke-width: 2; stroke-linecap: round;"
                        />
                    </svg>
                    <span>{d.plan.seat}</span>
                </li>
            {/if}
        </ul>
    </figcaption>
</figure>
