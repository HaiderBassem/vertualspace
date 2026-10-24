import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Swójski status",
    set: "Status nastajić…",
    clear: "Status wotstronić",
    edit: "Status wobdźěłać",
    emojiLabel: "Emoji",
    textLabel: "Kajki je waš status?",
    textPlaceholder: "na př. Na dowolu hač do póndźele",
    durationLabel: "Wotstronić po",
    durations: {
        never: "Njewotstronić",
        "30m": "30 mjeńšin",
        "1h": "1 hodźina",
        "4h": "4 hodźiny",
        today: "Dźensa",
        week: "Tutón tydźeń",
    },
    presets: {
        meeting: "W zetkanju",
        commuting: "Po puću",
        sick: "Chory",
        vacation: "Na dowolu",
        remote: "Dźěłam z doma",
        focus: "Koncentrowany",
    },
    save: "Składować",
    cancel: "Přetorhnyć",
    focusSession: {
        title: "Koncentracija",
        hint: "Na chwilu njewobćežować, tež hdyž so pohibujeće",
        minutes: "{count} min",
        until: "🎧 Koncentrowany hač do {time}",
        end: "Skónčić",
        status: "Koncentrowany",
    },
};

export default customStatus;
