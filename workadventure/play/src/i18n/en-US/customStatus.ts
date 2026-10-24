import type { BaseTranslation } from "../i18n-types";

const customStatus: BaseTranslation = {
    title: "Custom status",
    set: "Set a status…",
    clear: "Clear status",
    edit: "Edit status",
    emojiLabel: "Emoji",
    textLabel: "What's your status?",
    textPlaceholder: "e.g. On vacation until Monday",
    durationLabel: "Clear after",
    durations: {
        never: "Don't clear",
        "30m": "30 minutes",
        "1h": "1 hour",
        "4h": "4 hours",
        today: "Today",
        week: "This week",
    },
    presets: {
        meeting: "In a meeting",
        commuting: "Commuting",
        sick: "Out sick",
        vacation: "On vacation",
        remote: "Working remotely",
        focus: "Focusing",
    },
    save: "Save",
    cancel: "Cancel",
    focusSession: {
        title: "Focus",
        hint: "Do not disturb for a while, even when you walk around",
        minutes: "{count} min",
        until: "🎧 Focusing until {time}",
        end: "End",
        status: "Focusing",
    },
};

export default customStatus;
