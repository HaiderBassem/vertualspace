import { describe, expect, it } from "vitest";
import { eventProcessor } from "../../src/pusher/models/eventProcessorInit";

describe("eventProcessor", () => {
    it("lets the waves delivered by the back reach the front unchanged", () => {
        // The processors also run on the events coming from the back (SpaceToFrontDispatcher): refusing waves
        // there would drop every legitimate wave. Forged waves are refused in SocketManager.handlePrivateEvent.
        const wave = { $case: "wave" as const, wave: { waveBack: true } };

        expect(eventProcessor.processPrivateEvent(wave, undefined)).toEqual(wave);
    });
});
