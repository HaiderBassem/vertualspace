import * as Phaser from "phaser";
import { gameManager } from "../Game/GameManager";

export const EmptySceneName = "EmptyScene";

export class EmptyScene extends Phaser.Scene {
    constructor() {
        super({
            key: EmptySceneName,
        });
    }

    preload() {}

    create() {
        // There is no start room yet while the visitor is being redirected, asked to sign in, or shown an error.
        const backgroundColor = gameManager.currentStartedRoomOrNull?.backgroundColor;
        if (backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(backgroundColor);
        }
    }

    update(time: number, delta: number): void {}
}
