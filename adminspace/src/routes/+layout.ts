import type { LayoutLoad } from "./$types";
import { messagesFor } from "$lib/i18n";

/** Adds the dictionary of the negotiated locale. Runs on server and client, so it is never serialized. */
export const load: LayoutLoad = ({ data }) => ({ ...data, m: messagesFor(data.locale) });
