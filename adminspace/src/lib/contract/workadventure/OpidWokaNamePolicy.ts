// Vendored from WorkAdventure (libs/messages/src/JsonMessages/OpidWokaNamePolicy.ts) by scripts/sync-contract.ts.
// Do not edit: run "npm run contract:sync" instead. License: see the WorkAdventure repository.
import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const OpidWokaNamePolicy = extendApi(
  z.enum(["user_input", "allow_override_opid", "force_opid", ""]),
  {
    example: "['user_input', 'allow_override_opid', 'force_opid']",
  },
)
  .optional()
  .nullable();
export type OpidWokaNamePolicy = z.infer<typeof OpidWokaNamePolicy>;
