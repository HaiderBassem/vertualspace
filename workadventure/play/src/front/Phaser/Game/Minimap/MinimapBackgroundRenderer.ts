import * as Phaser from "phaser";
import { asError } from "catch-unknown";
import type { Size } from "../../../Components/Minimap/MinimapGeometry";
import type { GameScene } from "../GameScene";

import TilemapLayer = Phaser.Tilemaps.TilemapLayer;

type MinimapDrawable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth;

let textureCounter = 0;

/**
 * Collects what the map is made of, in drawing order: the visible tile layers and the entities placed with the
 * map editor. Players, bubbles and UI are left out: the overlay draws those.
 */
function collectMapDrawables(scene: GameScene): MinimapDrawable[] {
    const gameMapFrontWrapper = scene.getGameMapFrontWrapper();
    const drawables: MinimapDrawable[] = [];

    for (const layer of gameMapFrontWrapper.phaserLayers) {
        if (layer.visible && layer.alpha > 0) {
            drawables.push(layer);
        }
    }
    for (const entity of gameMapFrontWrapper.getEntitiesManager().getEntities().values()) {
        if (entity.visible && entity.alpha > 0) {
            drawables.push(entity);
        }
    }

    // Same order as the scene: layers below the floor (negative depth), entities sorted by their y, then the layers
    // above the floor. Array.prototype.sort is stable, so layers sharing a depth keep the Tiled order.
    return drawables.sort((a, b) => a.depth - b.depth);
}

/**
 * The Canvas renderer crops a texture snapshot to the size of the game canvas (the WebGL one does not): in that
 * mode the texture is kept within the game canvas, the browser upscales the picture a little instead.
 */
function fitSnapshotSize(scene: GameScene, size: Size): Size {
    if (scene.game.renderer.type !== Phaser.CANVAS) {
        return size;
    }
    const ratio = Math.min(1, scene.game.canvas.width / size.width, scene.game.canvas.height / size.height);
    return { width: Math.floor(size.width * ratio), height: Math.floor(size.height * ratio) };
}

/**
 * Draws the whole map once into a small offscreen texture and returns it as an image of the requested size
 * (device pixels). It costs one render pass of the map plus one readPixels, so it is meant to run once per
 * scene and when the map changes, never per frame.
 */
export function renderMinimapBackground(scene: GameScene, requestedSize: Size): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const mapWidth = scene.Map.widthInPixels;
        const mapHeight = scene.Map.heightInPixels;
        const size = fitSnapshotSize(scene, requestedSize);
        if (mapWidth <= 0 || mapHeight <= 0 || size.width <= 0 || size.height <= 0) {
            reject(new Error("Cannot render the minimap of an empty map"));
            return;
        }

        textureCounter += 1;
        const texture = scene.textures.addDynamicTexture(
            `__minimap_background_${textureCounter}`,
            size.width,
            size.height,
        );
        if (!texture) {
            reject(new Error("Could not create the minimap texture"));
            return;
        }

        // Tile layers only render the tiles the camera sees: the texture camera sees the whole map, but culling is
        // switched off for this single pass anyway so that no tile is skipped at this tiny zoom level.
        const culledLayers: TilemapLayer[] = [];
        try {
            texture.camera.setZoom(Math.min(size.width / mapWidth, size.height / mapHeight));
            texture.camera.centerOn(mapWidth / 2, mapHeight / 2);

            const drawables = collectMapDrawables(scene);
            for (const drawable of drawables) {
                if (drawable instanceof TilemapLayer && !drawable.skipCull) {
                    drawable.setSkipCull(true);
                    culledLayers.push(drawable);
                }
            }

            texture.draw(drawables);
            texture.render();
        } catch (error: unknown) {
            texture.destroy();
            reject(asError(error));
            return;
        } finally {
            for (const layer of culledLayers) {
                layer.setSkipCull(false);
            }
        }

        // The pixels are read synchronously; only the image decoding is asynchronous.
        texture.snapshot((snapshot) => {
            texture.destroy();
            if (snapshot instanceof HTMLImageElement) {
                resolve(snapshot);
            } else {
                reject(new Error("Could not read the minimap texture"));
            }
        });
    });
}
