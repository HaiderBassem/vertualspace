import { createHash } from "node:crypto";
import type { TemplateSection } from "../../catalog/manifest";

function stableId(roomId: string, index: number, part: string): string {
    const hex = createHash("sha256").update(`${roomId}:meeting:${index}:${part}`).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Native WorkAdventure meeting areas. IDs and meeting names remain stable across job retries. */
export function templateMeetingAreas(roomId: string, meetings: TemplateSection["meetings"]) {
    return (meetings ?? []).map((meeting, index) => ({
        id: stableId(roomId, index, "area"),
        ...meeting,
        visible: true,
        properties: [
            {
                id: stableId(roomId, index, "livekit"),
                type: "livekitRoomProperty" as const,
                roomName: `meeting-${roomId}-${index}`,
                livekitRoomConfig: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    disableChat: false,
                    raiseHandEnabled: true,
                },
            },
        ],
    }));
}
