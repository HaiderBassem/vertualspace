/**
 * GET /api/woka/list, GET /api/companion/list,
 * POST /api/save-name, POST /api/save-textures, POST /api/save-companion-texture.
 *
 * WorkAdventure requires the save endpoints to answer 204 exactly.
 */
import { z } from "zod";
import { json, noContent } from "../../http/problem";
import { updateMember } from "../../services/members";
import { buildCompanionList, buildWokaList } from "../../services/textures";
import { resolveWorldOfPlayUri } from "../../services/worlds";
import { readJson, type ApiContext } from "../router";

export async function getWokaList(_: ApiContext): Promise<Response> {
    return json(await buildWokaList());
}

export async function getCompanionList(_: ApiContext): Promise<Response> {
    return json(await buildCompanionList());
}

const SaveBase = z.object({ playUri: z.string().min(1).max(2048), userIdentifier: z.string().min(1).max(320) });

const SaveName = SaveBase.extend({ name: z.string().max(200) });
const SaveTextures = SaveBase.extend({ textures: z.array(z.string().max(128)).max(20) });
const SaveCompanion = SaveBase.extend({ texture: z.string().max(128).nullable() });

/**
 * Applies a save to the member of the world. Rooms outside of any world, and people not recorded
 * yet, have nothing to update: WorkAdventure still gets its 204.
 */
async function saveFor(playUri: string, apply: (worldId: string) => Promise<unknown>): Promise<Response> {
    const context = await resolveWorldOfPlayUri(playUri);
    if (context) await apply(context.world.id);
    return noContent();
}

const invalid = () => json({ status: "error", message: "Invalid body" }, { status: 400 });

export async function postSaveName({ request }: ApiContext): Promise<Response> {
    const body = SaveName.safeParse(await readJson(request));
    if (!body.success) return invalid();
    return saveFor(body.data.playUri, (worldId) =>
        updateMember(worldId, body.data.userIdentifier, { name: body.data.name }),
    );
}

export async function postSaveTextures({ request }: ApiContext): Promise<Response> {
    const body = SaveTextures.safeParse(await readJson(request));
    if (!body.success) return invalid();
    return saveFor(body.data.playUri, (worldId) =>
        updateMember(worldId, body.data.userIdentifier, { characterTextureIds: body.data.textures }),
    );
}

export async function postSaveCompanionTexture({ request }: ApiContext): Promise<Response> {
    const body = SaveCompanion.safeParse(await readJson(request));
    if (!body.success) return invalid();
    return saveFor(body.data.playUri, (worldId) =>
        updateMember(worldId, body.data.userIdentifier, { companionTextureId: body.data.texture }),
    );
}
