// Vendored from WorkAdventure (libs/messages/src/JsonMessages/MeRequest.ts) by scripts/sync-contract.ts.
// Do not edit: run "npm run contract:sync" instead. License: see the WorkAdventure repository.
import { z } from "zod";

export const MeRequest = z.object({
  token: z.string(),
  playUri: z.string(),
  "localStorageCharacterTextureIds[]": z
    .union([z.string(), z.array(z.string())])
    .optional(),
  localStorageCompanionTextureId: z.string().optional(),
  chatID: z.string().optional(),
});

export type MeRequest = z.infer<typeof MeRequest>;
