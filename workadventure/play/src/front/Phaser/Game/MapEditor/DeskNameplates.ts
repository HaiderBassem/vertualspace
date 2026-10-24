import type { AreaData, PersonalAreaPropertyData } from "@workadventure/map-editor";
import { getDeskProperty } from "@workadventure/map-editor";
import { DEPTH_INGAME_TEXT_INDEX } from "../DepthIndexes";
import type { NameplateTexts } from "./DeskNameplate";
import { NAMEPLATE_BACKGROUNDS, nameplateFor } from "./DeskNameplate";

/** What the signs need to know of the office. */
export interface DeskNameplatesSource {
    desks(): AreaData[];
    /** Whether one of the people the desk belongs to is at it now. */
    ownerHere(area: AreaData, desk: PersonalAreaPropertyData): boolean;
    /** The name of the owner of the desk, when it is known. */
    ownerName(desk: PersonalAreaPropertyData): string | undefined;
    /** The name of whoever sits at the desk now, if anybody does. */
    occupantName(area: AreaData): string | undefined;
    /** Whether the signs are shown (they are hidden while the map is being edited, not to hide what is edited). */
    visible(): boolean;
    texts(): NameplateTexts;
}

/** How often the signs are brought up to date (people come and go), in milliseconds. */
const REFRESH_DELAY = 2000;

/**
 * Shows a sign above each desk of the office (see DeskNameplate). The signs are drawn by the game, above the map, and are
 * brought up to date every couple of seconds and whenever the desks change.
 */
export class DeskNameplates {
    private readonly plates = new Map<string, Phaser.GameObjects.Text>();
    private readonly timer: Phaser.Time.TimerEvent;
    private destroyed = false;

    constructor(
        private readonly scene: Phaser.Scene & { markDirty(): void },
        private readonly source: DeskNameplatesSource,
    ) {
        this.timer = scene.time.addEvent({ delay: REFRESH_DELAY, loop: true, callback: () => this.refresh() });
        this.refresh();
    }

    public refresh(): void {
        if (this.destroyed) return;
        const texts = this.source.texts();
        const now = Date.now();
        const visible = this.source.visible();
        const seen = new Set<string>();
        let changed = false;
        for (const area of this.source.desks()) {
            const desk = getDeskProperty(area);
            if (!desk) continue;
            seen.add(area.id);
            const plate = nameplateFor(
                desk,
                {
                    ownerName: this.source.ownerName(desk),
                    ownerHere: this.source.ownerHere(area, desk),
                    occupantName: this.source.occupantName(area),
                    now,
                },
                texts,
            );
            let text = this.plates.get(area.id);
            if (!text) {
                text = this.scene.add
                    .text(0, 0, "", {
                        fontFamily: "Roboto, sans-serif",
                        fontSize: "9px",
                        color: "#ffffff",
                        padding: { x: 3, y: 1 },
                    })
                    .setOrigin(0.5, 1)
                    .setResolution(3)
                    .setAlpha(0.92)
                    .setDepth(DEPTH_INGAME_TEXT_INDEX);
                this.plates.set(area.id, text);
                changed = true;
            }
            const x = Math.round(area.x + area.width / 2);
            const y = Math.round(area.y);
            if (text.x !== x || text.y !== y) {
                text.setPosition(x, y);
                changed = true;
            }
            if (text.text !== plate.text) {
                text.setText(plate.text);
                changed = true;
            }
            const background = NAMEPLATE_BACKGROUNDS[plate.tone];
            if (text.style.backgroundColor !== background) {
                text.setBackgroundColor(background);
                changed = true;
            }
            if (text.visible !== visible) {
                text.setVisible(visible);
                changed = true;
            }
        }
        for (const [id, text] of this.plates) {
            if (!seen.has(id)) {
                text.destroy();
                this.plates.delete(id);
                changed = true;
            }
        }
        if (changed) {
            this.scene.markDirty();
        }
    }

    public destroy(): void {
        this.destroyed = true;
        this.timer.remove();
        for (const text of this.plates.values()) {
            text.destroy();
        }
        this.plates.clear();
    }
}
