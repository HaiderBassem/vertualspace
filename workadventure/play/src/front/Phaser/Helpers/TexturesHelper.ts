import * as Phaser from "phaser";
import { asError } from "catch-unknown";
import { Model3D, renderModel } from "@workadventure/map-editor";

import Sprite = Phaser.GameObjects.Sprite;

export class TexturesHelper {
    /** The furniture whose 3D model is being drawn, or has been: one drawing per texture, whoever asks. */
    private static readonly modelTextures = new Map<string, Promise<boolean>>();

    /**
     * Makes the texture of a piece of furniture: the game draws it from its 3D model when it has one, and loads its image
     * otherwise (or when the model cannot be drawn). Resolves once the texture exists.
     */
    public static async loadEntityTexture(
        scene: Phaser.Scene,
        prefab: { imagePath: string; modelPath?: string | undefined },
        imageUrl: string,
    ): Promise<void> {
        if (scene.textures.exists(prefab.imagePath)) {
            return;
        }
        if (prefab.modelPath && (await TexturesHelper.drawEntityModel(scene, prefab.imagePath, prefab.modelPath))) {
            return;
        }
        await TexturesHelper.loadEntityImage(scene, prefab.imagePath, imageUrl);
    }

    private static drawEntityModel(scene: Phaser.Scene, key: string, modelUrl: string): Promise<boolean> {
        let drawing = TexturesHelper.modelTextures.get(key);
        if (drawing === undefined) {
            drawing = (async (): Promise<boolean> => {
                try {
                    const response = await fetch(modelUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${modelUrl}: ${response.statusText}`);
                    }
                    const rendered = renderModel(Model3D.parse(await response.json()));
                    const canvas = document.createElement("canvas");
                    canvas.width = rendered.width;
                    canvas.height = rendered.height;
                    const context = canvas.getContext("2d");
                    if (!context) {
                        throw new Error("No 2D canvas to draw the 3D model on");
                    }
                    context.putImageData(
                        new ImageData(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height),
                        0,
                        0,
                    );
                    if (!scene.textures.exists(key)) {
                        scene.textures.addCanvas(key, canvas);
                    }
                    return true;
                } catch (error) {
                    console.warn("Could not draw the 3D model, showing its image instead", modelUrl, error);
                    return false;
                }
            })();
            TexturesHelper.modelTextures.set(key, drawing);
        }
        return drawing;
    }

    public static async getSnapshot(
        scene: Phaser.Scene,
        ...sprites: { sprite: Sprite; frame?: string | number }[]
    ): Promise<string> {
        if (!scene.game.renderer) {
            // In headless mode, we cannot take snapshots.
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            return "";
        }
        const rt = scene.make.renderTexture({}, false);
        try {
            for (const { sprite, frame } of sprites) {
                if (frame) {
                    sprite.setFrame(frame);
                }
                rt.draw(sprite, sprite.displayWidth * 0.5, sprite.displayHeight * 0.5);
            }
            rt.render();
            return new Promise<string>((resolve, reject) => {
                try {
                    rt.snapshot(
                        (url) => {
                            if (url instanceof HTMLImageElement) {
                                resolve(url.src);
                            } else {
                                console.error("Unexpected color object received for snapshot", url);
                                resolve("");
                            }
                            rt.destroy();
                        },
                        "image/png",
                        1,
                    );
                } catch (error) {
                    rt.destroy();
                    reject(asError(error));
                }
            });
        } catch (error) {
            rt.destroy();
            throw new Error("Could not get the snapshot", { cause: error });
        }
    }

    public static createRectangleTexture(
        scene: Phaser.Scene,
        textureKey: string,
        width: number,
        height: number,
        color: number,
    ): void {
        const rectangleTexture = scene.add.graphics().fillStyle(color, 1).fillRect(0, 0, width, height);
        rectangleTexture.generateTexture(textureKey, width, height);
        rectangleTexture.destroy();
    }

    public static createCircleTexture(
        scene: Phaser.Scene,
        textureKey: string,
        radius: number,
        color: number,
        outlineColor?: number,
        outlineThickness?: number,
    ): void {
        const circleTexture = scene.add.graphics().fillStyle(color, 1).fillCircle(radius, radius, radius);
        if (outlineColor) {
            circleTexture.lineStyle(outlineThickness ?? 1, outlineColor).strokeCircle(radius, radius, radius);
        }
        circleTexture.generateTexture(textureKey, radius * 2, radius * 2);
        circleTexture.destroy();
    }

    public static async loadEntityImage(scene: Phaser.Scene, key: string, url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (scene.textures.exists(key)) {
                resolve();
            }
            scene.load.once(`filecomplete-image-${key}`, () => {
                resolve();
            });
            scene.load.image(key, url);
            scene.load.start();
        });
    }
}
