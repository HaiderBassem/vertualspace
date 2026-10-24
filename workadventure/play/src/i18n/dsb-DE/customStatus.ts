import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Swójski status",
    set: "Status nastajiś…",
    clear: "Status wulašowaś",
    edit: "Status wobźěłaś",
    emojiLabel: "Emoji",
    textLabel: "Kaki jo waš status?",
    textPlaceholder: "na pś. Na dowolu až do pónjeźele",
    durationLabel: "Wulašowaś pó",
    durations: {
        never: "Njewulašowaś",
        "30m": "30 minutow",
        "1h": "1 góźina",
        "4h": "4 góźiny",
        today: "Źinsa",
        week: "Toś ten tyźeń",
    },
    presets: {
        meeting: "W zetkanju",
        commuting: "Na droze",
        sick: "Chory",
        vacation: "Na dowolu",
        remote: "Źěłam z doma",
        focus: "Koncentrěrowany",
    },
    save: "Zachowaś",
    cancel: "Pśetergnuś",
    focusSession: {
        title: "Koncentracija",
        hint: "Na chylu njewobśěžowaś, teke gaž wokoło chójźośo",
        minutes: "{count} min",
        until: "🎧 Koncentrěrowany až do {time}",
        end: "Skóńcyś",
        status: "Koncentrěrowany",
    },
};

export default customStatus;
