# 3D models of the furniture

Every piece of furniture of the built-in catalog (50 components, 150+ variants) is a **3D model**: solid shapes in
space with colors, drawn by a renderer that follows the rays of the camera through them, with lighting, cast shadows,
height shading and an outline. The game draws the models itself when it loads a map; the picture of each variant is
drawn from the same model, so that the editor's palette, the catalog pages and any client that cannot draw models show
exactly the same furniture.

WorkAdventure's map is still a flat tile map seen from above: the models are drawn into it from a fixed point of view
(from above and from the front, like the walls and floors around them), they cannot be turned freely. What the models
add over drawn pictures is that they are real geometry, which the game and the servers use:

- **Places to sit.** A model says where people can sit on it and which way they face: a sofa has two seats, a garden
  bench two, a log bench two, a picnic table four (two on each bench, facing each other), a chair or beanbag one. The
  room server and the browsers read them from the world's collection, so everybody agrees (see [DESKS.md](DESKS.md)).
- **One source.** A chair facing right is the chair facing down turned a quarter, not another drawing; colors and
  variants come from the model's builder.

## Where things are

| What                                                  | Where                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Model format (`adminspace.model/1`) and its limits    | `src/lib/catalog/model3d/types.ts`                                                     |
| The renderer                                          | `src/lib/catalog/model3d/render.ts`                                                    |
| The copy the game uses (identical, kept by the sync)  | `workadventure/libs/map-editor/src/Model3D/` (`npm run model3d:sync`)                  |
| The models of the built-in furniture                  | `scripts/catalog/models.ts` (one builder per component)                                |
| What each variant publishes                           | `<variant>.model.json` next to `<variant>.png` in `catalog/builtin/<component>/`       |
| The model and seats in the world's collection         | `modelPath` and `seats` of each prefab in `/wa/worlds/<id>/collection.json`            |
| The game drawing a model                              | `play/src/front/Phaser/Helpers/TexturesHelper.ts` (`loadEntityTexture`)                |

## The format

A model is JSON: the size of its picture (whole 32 px cells, at most 256), the depth of its footprint on the ground, up
to 400 shapes and up to 8 seats.

- Space: x right, y up (height), z towards the viewer; pixels of the map. The footprint is x in 0..width, z in
  0..depth; its front edge is two pixels above the bottom of the picture. Height is drawn compressed
  (`HEIGHT_SCALE` = 0.7 of a pixel up the picture per pixel of height), so a model of depth d in a picture of height h
  can be `(h - d - 2) / 0.7` tall at its back edge.
- Shapes: `box` (`at` is its corner, `size`), `cone` (a cone with its top cut off, which is a cylinder when both radii
  are equal; `at` is the centre of its base, `squash` makes ovals), `ellipsoid` (`at` is its centre, three radii).
  Each has a `color` (`#rrggbb`) and may have `yaw` (degrees), `opacity` (glass, water) and `glow` (lamps, screens).
- Seats: `{ x, y, direction }`, in pixels from the top-left corner of the picture: where the body of the person is, and
  the way they face (`Down` faces the viewer).

The catalog validator (`src/lib/server/catalog/validate.ts`) refuses a model that is not valid, or that is not the size
of its picture (`modelInvalid`, `modelSize`). A variant without a model works as before (its picture is shown).

## Adding or changing a model

1. Write or edit the builder in `scripts/catalog/models.ts` (keep the variant keys: they are in the maps).
2. `npm run catalog:generate` (writes `catalog/builtin`: pictures, models, manifests), then `npm run model3d:sync` if
   the renderer changed. `tests/catalogModels.test.ts` checks every variant: valid, inside its picture, the size of the
   picture it replaces, seats where expected.
3. Bump `VERSION` in `scripts/catalog/generate.ts` (versions never change once stored), publish with
   `npm run catalog:import` (the image does it at start), and install the new version in worlds
   (`catalog-install`, see [NATURE.md](NATURE.md)).

## Putting furniture in an existing world

`furnish-world` adds a furnished office and a garden to a world that is already there, from the built-in room
templates (reception, open office, two meeting rooms, lounge, garden terrace), linked by doors, and makes the reception
the room people land in:

```sh
docker compose exec adminspace node build/cli/furnish-world.js --org acme --world office [--layout hybrid] [--size medium] [--no-garden] [--keep-default]
```

It leaves rooms the world already has as they are, and the rooms are uploaded by the server's background jobs.
