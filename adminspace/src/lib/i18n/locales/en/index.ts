/**
 * English (en-US): the source dictionary. Its shape is the `Messages` type every locale must satisfy,
 * so a missing translation key is a type error (npm run typecheck).
 *
 * One module per area of the back office, so that areas can be translated and reviewed independently.
 */
import { common } from "./common";
import { shell } from "./shell";
import { workadventure } from "./workadventure";
import { organizations } from "./organizations";
import { worlds } from "./worlds";
import { rooms } from "./rooms";
import { people } from "./people";
import { moderation } from "./moderation";
import { live } from "./live";
import { integrations } from "./integrations";
import { platform } from "./platform";
import { onboarding } from "./onboarding";
import { workspaces } from "./workspaces";
import { app } from "./app";
import { team } from "./team";
import { home } from "./home";
import { control } from "./control";
import { catalog } from "./catalog";
import { office } from "./office";
import { desks } from "./desks";
import { integrationCenter } from "./integrationCenter";
import { presence } from "./presence";

export const en = {
    common,
    shell,
    workadventure,
    organizations,
    worlds,
    rooms,
    people,
    moderation,
    live,
    integrations,
    platform,
    onboarding,
    workspaces,
    app,
    team,
    home,
    control,
    catalog,
    office,
    desks,
    integrationCenter,
    presence,
};

export type Messages = typeof en;
