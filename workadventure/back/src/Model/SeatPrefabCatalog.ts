import type { PrefabDescription, PrefabDescriber, WAMFileFormat } from "@workadventure/map-editor";
import { SeatDirection } from "@workadventure/map-editor";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
import { z } from "zod";

/** How long what a collection said is trusted before it is read again. */
const COLLECTION_TTL_MS = 5 * 60 * 1000;
/** Furniture the collections do not know is looked for again at most this often. */
const MISS_RETRY_MS = 30 * 1000;

const CollectionFile = z.object({ collection: z.array(z.unknown()) });
const CollectionPrefab = z.object({
    id: z.string(),
    name: z.string(),
    direction: SeatDirection.optional(),
    // The places to sit that the 3D model of the furniture has; a malformed list only costs the furniture its seats.
    seats: z
        .array(z.object({ x: z.number(), y: z.number(), direction: SeatDirection }))
        .max(8)
        .optional()
        .catch(undefined),
});

/**
 * What the collections of a map say of its furniture (name, direction), for the ids that do not carry them: the admin
 * back office names its furniture "adminspace:<component>:<variant>". The room needs it to know which of those
 * pieces of furniture are something to sit on, exactly as the browsers do.
 *
 * The collection addresses come from the map file, which people who edit the map can change: they are fetched like
 * maps are, refusing anything that points at the local network.
 */
export class SeatPrefabCatalog {
    private readonly prefabs = new Map<string, PrefabDescription>();
    private readonly loadedAt = new Map<string, number>();
    private readonly loading = new Map<string, Promise<void>>();
    private lastMissRetry = 0;

    constructor(
        private readonly now: () => number = () => Date.now(),
        private readonly fetchCollection: (url: string) => Promise<unknown> = async (url) =>
            (await mapFetcher.fetchFile(url)).data,
    ) {}

    /** What is known of a piece of furniture right now. */
    public readonly describe: PrefabDescriber = (prefabId) => this.prefabs.get(prefabId);

    /**
     * Reads the collections of the map that are stale or unknown. With `unknownIds` (furniture on the map that nothing
     * describes), the collections are read again, because they may have been updated since.
     */
    public async refresh(wam: WAMFileFormat | undefined, unknownIds: readonly string[] = []): Promise<void> {
        if (!wam) return;
        const now = this.now();
        const retryMisses = unknownIds.length > 0 && now - this.lastMissRetry >= MISS_RETRY_MS;
        if (retryMisses) this.lastMissRetry = now;
        const urls = (wam.entityCollections ?? []).filter((c) => c.type === "file").map((c) => c.url);
        await Promise.all(
            urls.map((url) => {
                const loadedAt = this.loadedAt.get(url);
                const fresh = loadedAt !== undefined && now - loadedAt < COLLECTION_TTL_MS;
                if (fresh && !retryMisses) return Promise.resolve();
                return this.load(url);
            }),
        );
    }

    private load(url: string): Promise<void> {
        const pending = this.loading.get(url);
        if (pending) return pending;
        const task = (async () => {
            try {
                const parsed = CollectionFile.safeParse(await this.fetchCollection(url));
                if (!parsed.success) return;
                for (const entry of parsed.data.collection) {
                    // One malformed entry only costs that entry.
                    const prefab = CollectionPrefab.safeParse(entry);
                    if (prefab.success) {
                        this.prefabs.set(prefab.data.id, {
                            name: prefab.data.name,
                            direction: prefab.data.direction,
                            seats: prefab.data.seats,
                        });
                    }
                }
                this.loadedAt.set(url, this.now());
            } catch (error) {
                // A collection that cannot be read leaves its furniture as it was: it is not something to sit on yet.
                console.warn(`Could not read the furniture collection ${url}`, error);
                this.loadedAt.set(url, this.now() - COLLECTION_TTL_MS + MISS_RETRY_MS);
            } finally {
                this.loading.delete(url);
            }
        })();
        this.loading.set(url, task);
        return task;
    }
}
