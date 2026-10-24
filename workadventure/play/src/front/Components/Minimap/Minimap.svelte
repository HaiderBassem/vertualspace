<script lang="ts">
    import { onDestroy, tick, untrack } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameSceneStore } from "../../Stores/GameSceneStore";
    import { mapEditorModeStore, mapExplorationModeStore } from "../../Stores/MapEditorStore";
    import { windowSize } from "../../Stores/CoWebsiteStore";
    import { enableUserInputsStore } from "../../Stores/UserInputStore";
    import { currentPlayerGroupIdStore } from "../../Stores/CurrentPlayerGroupStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { inExternalServiceStore, proximityMeetingStore } from "../../Stores/MyMediaStore";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import { biggestAvailableAreaStore } from "../../Stores/BiggestAvailableAreaStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { minimapExpandedStore, minimapReservedHeightStore } from "../../Stores/MinimapStore";
    import type { GameScene } from "../../Phaser/Game/GameScene";
    import { renderMinimapBackground } from "../../Phaser/Game/Minimap/MinimapBackgroundRenderer";
    import type { MinimapLayout, Point, Size } from "./MinimapGeometry";
    import {
        computeBackgroundResolution,
        computeMinimapLayout,
        findClosestDot,
        minimapToWorld,
        nudgeWorldPoint,
        worldToMinimap,
    } from "./MinimapGeometry";
    import type { MinimapDot } from "./MinimapOverlay";
    import { collectMinimapFrame, drawMinimapFrame } from "./MinimapOverlay";
    import { IconChevronDown, IconMap } from "@wa-icons";

    /** The overlay (dots, viewport) is redrawn 4 times per second; the map image only when the map changes. */
    const OVERLAY_REFRESH_MS = 250;
    /** Map changes often come in bursts (an entity dragged, tiles set by a script): redraw the image once. */
    const BACKGROUND_REFRESH_DEBOUNCE_MS = 1500;
    /** How close (CSS pixels) the pointer must be to a dot to show its name. */
    const HOVER_DISTANCE = 8;
    /** Margin between the card and the bottom-left corner (bottom-2 / left-2). */
    const CORNER_MARGIN = 8;
    const SMALL_SCREEN_MAX_WIDTH = 768;
    const SMALL_SCREEN_MAX_HEIGHT = 480;

    const abortController = new AbortController();

    let scene: GameScene | undefined = $derived($gameSceneStore);
    let mapSize: Size | undefined = $state.raw(undefined);
    let layout: MinimapLayout | undefined = $derived(mapSize ? computeMinimapLayout(mapSize) : undefined);
    let devicePixelRatio = $state(readDevicePixelRatio());

    let backgroundImage: HTMLImageElement | undefined = $state.raw(undefined);
    let backgroundDirty = $state(true);
    let backgroundGeneration = 0;
    let backgroundRefreshTimeout: ReturnType<typeof setTimeout> | undefined;

    let baseCanvas: HTMLCanvasElement | undefined = $state();
    let overlayCanvas: HTMLCanvasElement | undefined = $state();
    let wrapper: HTMLDivElement | undefined = $state();
    let expandButton: HTMLButtonElement | undefined = $state();
    let collapseButton: HTMLButtonElement | undefined = $state();
    let wrapperHeight = $state(0);

    /** The latest drawn dots, in card pixels, for hit testing. */
    let lastDots: MinimapDot[] = [];
    let hoveredDot: MinimapDot | undefined = $state.raw(undefined);
    let otherPeopleCount = $state(0);
    /** Pointer position over the map surface (card pixels). */
    let pointerProbe: Point | undefined;
    /** Spot picked with the arrow keys (world pixels), while the surface has the keyboard focus. */
    let keyboardTarget: Point | undefined;
    /** Where the user clicked to walk (world pixels), until the woka gets there. */
    let walkTarget: Point | undefined;
    let redrawOverlay: (() => void) | undefined;

    let isSmallScreen = $derived(
        $windowSize.width < SMALL_SCREEN_MAX_WIDTH || $windowSize.height < SMALL_SCREEN_MAX_HEIGHT,
    );
    // A full-screen screen share covers the game. Otherwise videos only hide the minimap when they leave too little
    // free space, or no free space down to the bottom where the card sits: two video tiles at the top leave the
    // minimap visible, a camera grid hides it.
    let videosCoverMap = $derived.by(() => {
        if ($highlightFullScreen && $highlightedEmbedScreen !== undefined) {
            return true;
        }
        if (
            $proximityMeetingStore !== true ||
            $inExternalServiceStore ||
            $activePictureInPictureStore ||
            $streamableCollectionStore.size === 0
        ) {
            return false;
        }
        const area = $biggestAvailableAreaStore;
        const freeHeight = area.yEnd - area.yStart;
        return (
            freeHeight < Math.max(wrapperHeight + 48, $windowSize.height * 0.35) ||
            area.yEnd < $windowSize.height * 0.85
        );
    });
    let isVisible = $derived(
        scene !== undefined &&
            layout !== undefined &&
            !$mapEditorModeStore &&
            !$mapExplorationModeStore &&
            !isSmallScreen &&
            !videosCoverMap,
    );
    let expanded = $derived($minimapExpandedStore);
    /** Rendering only happens while the card is actually on screen. */
    let isActive = $derived(isVisible && expanded);
    let youLabel = $derived($LL.minimap.you());

    function readDevicePixelRatio(): number {
        // Above 2x the extra pixels are not worth their cost on such a small picture.
        return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    }

    function readMapSize(gameScene: GameScene): Size {
        return { width: gameScene.Map.widthInPixels, height: gameScene.Map.heightInPixels };
    }

    function scheduleBackgroundRefresh(): void {
        if (backgroundRefreshTimeout !== undefined) {
            clearTimeout(backgroundRefreshTimeout);
        }
        backgroundRefreshTimeout = setTimeout(() => {
            backgroundRefreshTimeout = undefined;
            backgroundDirty = true;
        }, BACKGROUND_REFRESH_DEBOUNCE_MS);
    }

    async function renderBackground(gameScene: GameScene, ratio: number, generation: number): Promise<void> {
        // Entities placed with the map editor are loaded asynchronously: wait for them to be part of the picture.
        await gameScene.getGameMapFrontWrapper().initializedPromise.promise;
        if (abortController.signal.aborted || generation !== backgroundGeneration) {
            return;
        }

        const size = readMapSize(gameScene);
        const renderLayout = computeMinimapLayout(size);
        if (!renderLayout) {
            return;
        }
        if (!mapSize || mapSize.width !== size.width || mapSize.height !== size.height) {
            // The map was resized: the card follows the new aspect ratio.
            mapSize = size;
        }

        const image = await renderMinimapBackground(gameScene, computeBackgroundResolution(renderLayout, ratio));
        if (abortController.signal.aborted || generation !== backgroundGeneration) {
            return;
        }
        backgroundImage = image;
    }

    // A new scene starts from scratch: new map, new picture.
    $effect(() => {
        const currentScene = scene;
        untrack(() => {
            backgroundGeneration += 1;
            backgroundImage = undefined;
            mapSize = currentScene ? readMapSize(currentScene) : undefined;
            backgroundDirty = true;
        });
    });

    // Tiles changed by a script, entities added or removed... The collision grid changes with them.
    $effect(() => {
        if (!scene) {
            return;
        }
        const subscription = scene
            .getGameMapFrontWrapper()
            .getMapChangedObservable()
            .subscribe(() => scheduleBackgroundRefresh());
        return () => subscription.unsubscribe();
    });

    // The map may be edited while the editor is open (the minimap is hidden then): redraw it once the editor closes.
    $effect(() => {
        if ($mapEditorModeStore) {
            backgroundDirty = true;
        }
    });

    // Moving the window to another screen can change the pixel ratio.
    $effect(() => {
        if ($windowSize.width > 0) {
            const ratio = readDevicePixelRatio();
            if (ratio !== untrack(() => devicePixelRatio)) {
                devicePixelRatio = ratio;
                backgroundDirty = true;
            }
        }
    });

    // Draw the map picture when it is needed and the card is on screen.
    $effect(() => {
        if (!isActive || !backgroundDirty || !scene) {
            return;
        }
        const currentScene = scene;
        const ratio = devicePixelRatio;
        backgroundDirty = false;
        backgroundGeneration += 1;
        const generation = backgroundGeneration;
        renderBackground(currentScene, ratio, generation).catch((error: unknown) => {
            console.warn("Could not draw the minimap", error);
        });
    });

    // Copy the map picture into the base canvas (again when the card is re-expanded: the canvas is new then).
    $effect(() => {
        if (!baseCanvas || !layout || !backgroundImage) {
            return;
        }
        const context = baseCanvas.getContext("2d");
        if (!context) {
            return;
        }
        const ratio = devicePixelRatio;
        context.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            backgroundImage,
            layout.offsetX * ratio,
            layout.offsetY * ratio,
            layout.imageWidth * ratio,
            layout.imageHeight * ratio,
        );
    });

    // The overlay loop: only while the card is on screen, and never while the tab is hidden.
    $effect(() => {
        if (!isActive || !scene || !layout || !overlayCanvas) {
            return;
        }
        const context = overlayCanvas.getContext("2d");
        if (!context) {
            return;
        }
        const currentScene = scene;
        const currentLayout = layout;
        const redraw = () => drawOverlay(currentScene, currentLayout, context);
        redrawOverlay = redraw;
        untrack(redraw);
        const interval = setInterval(redraw, OVERLAY_REFRESH_MS);
        return () => {
            clearInterval(interval);
            if (redrawOverlay === redraw) {
                redrawOverlay = undefined;
            }
        };
    });

    // Bottom-left UI drawn later (the proximity chat notifications) stacks above the card.
    $effect(() => {
        minimapReservedHeightStore.set(isVisible && wrapperHeight > 0 ? wrapperHeight + CORNER_MARGIN : 0);
    });

    function drawOverlay(gameScene: GameScene, currentLayout: MinimapLayout, context: CanvasRenderingContext2D): void {
        if (document.hidden) {
            return;
        }
        try {
            const frame = collectMinimapFrame(gameScene, currentLayout, $currentPlayerGroupIdStore, youLabel);
            lastDots = frame.dots;
            const othersCount = frame.dots.length - 1;
            if (othersCount !== otherPeopleCount) {
                otherPeopleCount = Math.max(0, othersCount);
            }
            drawMinimapFrame(context, frame, devicePixelRatio, {
                walkTarget: walkTarget ? worldToMinimap(walkTarget, currentLayout) : undefined,
                keyboardTarget: keyboardTarget ? worldToMinimap(keyboardTarget, currentLayout) : undefined,
            });
        } catch (error: unknown) {
            // The scene is being torn down (its camera or players are gone): the next scene brings a new minimap.
            console.debug("Minimap frame skipped", error);
            return;
        }
        updateHoveredDot(currentLayout);
    }

    function updateHoveredDot(currentLayout: MinimapLayout): void {
        const probe = pointerProbe ?? (keyboardTarget ? worldToMinimap(keyboardTarget, currentLayout) : undefined);
        const dot = probe ? findClosestDot(lastDots, probe, HOVER_DISTANCE) : undefined;
        if (dot?.userId !== hoveredDot?.userId || dot?.isMe !== hoveredDot?.isMe || dot?.x !== hoveredDot?.x) {
            hoveredDot = dot;
        }
    }

    function getMyPosition(): Point | undefined {
        // The scene may be between two players (reconnection): the field is declared but not always set.
        const player: GameScene["CurrentPlayer"] | undefined = scene?.CurrentPlayer;
        return player ? { x: player.x, y: player.y } : undefined;
    }

    function walkTo(target: Point): void {
        const currentScene = scene;
        if (!currentScene) {
            return;
        }
        // Same rules as clicking the map itself: a script may have disabled the controls or click-to-move.
        const userInputManager = currentScene.userInputManager;
        if (!userInputManager.isControlsEnabled || !userInputManager.isRightClickEnabled) {
            return;
        }

        walkTarget = target;
        redrawOverlay?.();
        currentScene
            .moveTo(target, true)
            .catch((error: unknown) => {
                console.warn("Cannot walk to the point clicked on the minimap", error);
            })
            .finally(() => {
                if (walkTarget === target) {
                    walkTarget = undefined;
                    redrawOverlay?.();
                }
            });
    }

    function onSurfaceClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        if (!layout) {
            return;
        }
        if (event.detail === 0) {
            // Activated without a pointer (assistive technology): walk to the spot picked with the keyboard.
            if (keyboardTarget) {
                walkTo(keyboardTarget);
            }
            return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        walkTo(minimapToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, layout));
    }

    function onSurfaceKeyDown(event: KeyboardEvent): void {
        if (!layout) {
            return;
        }
        // About two tiles per press on a regular map, more on a big one; Shift moves 4 times faster.
        const step =
            Math.max(32, Math.round(Math.max(layout.mapWidth, layout.mapHeight) / 48)) * (event.shiftKey ? 4 : 1);
        let dx = 0;
        let dy = 0;
        switch (event.key) {
            case "ArrowLeft":
                dx = -step;
                break;
            case "ArrowRight":
                dx = step;
                break;
            case "ArrowUp":
                dy = -step;
                break;
            case "ArrowDown":
                dy = step;
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                event.stopPropagation();
                if (keyboardTarget) {
                    walkTo(keyboardTarget);
                }
                return;
            default:
                return;
        }
        // The arrows move the target, not the woka: keep them away from the game.
        event.preventDefault();
        event.stopPropagation();
        const origin = keyboardTarget ?? getMyPosition();
        if (!origin) {
            return;
        }
        keyboardTarget = nudgeWorldPoint(origin, dx, dy, layout);
        redrawOverlay?.();
    }

    function onSurfaceFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        // Only for keyboard focus: a mouse click focuses the button too, and must not show the keyboard target.
        if (event.currentTarget.matches(":focus-visible")) {
            keyboardTarget = getMyPosition();
            redrawOverlay?.();
        }
    }

    function onSurfaceBlur(): void {
        keyboardTarget = undefined;
        if (layout) {
            updateHoveredDot(layout);
        }
        redrawOverlay?.();
    }

    function onSurfacePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerProbe = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        if (layout) {
            updateHoveredDot(layout);
        }
    }

    function onSurfacePointerLeave(): void {
        pointerProbe = undefined;
        if (layout) {
            updateHoveredDot(layout);
        }
    }

    function isTypingTarget(target: EventTarget | null): boolean {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        );
    }

    function onWindowKeyDown(event: KeyboardEvent): void {
        if (event.key !== "m" && event.key !== "M") {
            return;
        }
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        if (!isVisible || !$enableUserInputsStore || isTypingTarget(event.target)) {
            return;
        }
        setExpanded(!expanded);
    }

    // Near the card's edges the name is aligned on the dot rather than centered, so that it stays on screen.
    let tooltipPlacement = $derived.by(() => {
        if (!hoveredDot || !layout) {
            return { left: 0, alignment: "-translate-x-1/2" };
        }
        if (hoveredDot.x < layout.width * 0.25) {
            return { left: hoveredDot.x - 8, alignment: "translate-x-0" };
        }
        if (hoveredDot.x > layout.width * 0.75) {
            return { left: hoveredDot.x + 8, alignment: "-translate-x-full" };
        }
        return { left: hoveredDot.x, alignment: "-translate-x-1/2" };
    });

    /** Collapsing removes the focused button: hand the focus over to the button that replaces it. */
    function setExpanded(value: boolean): void {
        const hadFocus = wrapper?.contains(document.activeElement) ?? false;
        minimapExpandedStore.set(value);
        if (!hadFocus) {
            return;
        }
        tick()
            .then(() => (value ? collapseButton : expandButton)?.focus())
            .catch((error: unknown) => console.warn("Could not move the focus to the minimap toggle", error));
    }

    onDestroy(() => {
        abortController.abort();
        if (backgroundRefreshTimeout !== undefined) {
            clearTimeout(backgroundRefreshTimeout);
        }
        minimapReservedHeightStore.set(0);
    });
</script>

<svelte:window onkeydown={onWindowKeyDown} />

{#if scene && layout}
    <div
        class="absolute bottom-2 left-2 z-20 pointer-events-none flex flex-col items-start"
        class:hidden={!isVisible}
        bind:this={wrapper}
        bind:clientHeight={wrapperHeight}
        data-testid="minimap"
    >
        {#if expanded}
            <section
                id="minimap-card"
                aria-label={$LL.minimap.title()}
                class="relative pointer-events-auto bg-contrast/80 backdrop-blur rounded-lg p-1 shadow-lg"
            >
                <div class="relative" style:width="{layout.width}px" style:height="{layout.height}px">
                    <canvas
                        bind:this={baseCanvas}
                        width={Math.round(layout.width * devicePixelRatio)}
                        height={Math.round(layout.height * devicePixelRatio)}
                        class="absolute inset-0 w-full h-full rounded bg-white/5"
                        aria-hidden="true"
                    ></canvas>
                    <button
                        type="button"
                        class="absolute inset-0 w-full h-full p-0 m-0 rounded cursor-crosshair focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                        aria-label={$LL.minimap.surfaceLabel()}
                        aria-describedby="minimap-surface-description"
                        onclick={onSurfaceClick}
                        onkeydown={onSurfaceKeyDown}
                        onfocus={onSurfaceFocus}
                        onblur={onSurfaceBlur}
                        onpointermove={onSurfacePointerMove}
                        onpointerleave={onSurfacePointerLeave}
                        data-testid="minimap-surface"
                    >
                        <canvas
                            bind:this={overlayCanvas}
                            width={Math.round(layout.width * devicePixelRatio)}
                            height={Math.round(layout.height * devicePixelRatio)}
                            class="block w-full h-full"
                            aria-hidden="true"
                        ></canvas>
                    </button>
                    <span id="minimap-surface-description" class="sr-only">
                        {$LL.minimap.keyboardHint()}
                        {$LL.minimap.peopleCount({ count: otherPeopleCount })}
                    </span>

                    {#if hoveredDot}
                        <div
                            class="absolute pointer-events-none -translate-y-full {tooltipPlacement.alignment} whitespace-nowrap rounded bg-contrast px-2 py-0.5 text-xs font-bold text-white shadow"
                            style:left="{tooltipPlacement.left}px"
                            style:top="{hoveredDot.y - 8}px"
                            aria-hidden="true"
                            data-testid="minimap-player-name"
                        >
                            {hoveredDot.name}
                        </div>
                    {/if}
                </div>

                <div class="group absolute top-2 right-2">
                    <button
                        type="button"
                        bind:this={collapseButton}
                        class="flex items-center justify-center w-6 h-6 p-0 m-0 rounded bg-contrast/70 text-white hover:bg-contrast cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        aria-expanded="true"
                        aria-controls="minimap-card"
                        aria-label={$LL.minimap.hide()}
                        aria-keyshortcuts="M"
                        onclick={() => setExpanded(false)}
                        data-testid="minimap-toggle"
                    >
                        <IconChevronDown font-size="16" />
                    </button>
                    <div
                        class="absolute bottom-full right-0 mb-1.5 flex items-center gap-2 whitespace-nowrap rounded bg-contrast px-2 py-1 text-sm text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100"
                        aria-hidden="true"
                    >
                        {$LL.minimap.hide()}
                        <kbd class="rounded border border-solid border-white/50 px-1.5 text-xs font-bold">M</kbd>
                    </div>
                </div>
            </section>
        {:else}
            <div class="group relative pointer-events-auto">
                <button
                    type="button"
                    bind:this={expandButton}
                    class="flex items-center justify-center p-2 m-0 rounded-lg bg-contrast/80 backdrop-blur text-white hover:bg-contrast cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    aria-expanded="false"
                    aria-label={$LL.minimap.show()}
                    aria-keyshortcuts="M"
                    onclick={() => setExpanded(true)}
                    data-testid="minimap-toggle"
                >
                    <IconMap font-size="20" />
                </button>
                <div
                    class="absolute bottom-full left-0 mb-1.5 flex items-center gap-2 whitespace-nowrap rounded bg-contrast px-2 py-1 text-sm text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-hidden="true"
                >
                    {$LL.minimap.show()}
                    <kbd class="rounded border border-solid border-white/50 px-1.5 text-xs font-bold">M</kbd>
                </div>
            </div>
        {/if}
    </div>
{/if}
