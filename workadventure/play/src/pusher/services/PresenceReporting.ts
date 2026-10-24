import { registerDrainableService } from "@workadventure/shared-utils";
import { adminService } from "./AdminService";
import { PresenceReporter } from "./PresenceReporter";

/**
 * The reporter of this pusher. It sends nothing until the admin lists "api/presence/report" in its capabilities: app.ts
 * enables it once it read them.
 */
export const presenceReporter = new PresenceReporter({
    send: (report) => adminService.reportPresence(report),
});

registerDrainableService({
    name: "the presence reports",
    // Never longer than the shutdown budget: the list expires on its own anyway.
    drain: (timeoutMs) =>
        Promise.race([
            presenceReporter.drain(),
            new Promise<void>((resolve) => {
                setTimeout(resolve, timeoutMs).unref();
            }),
        ]),
    stop: () => presenceReporter.stop(),
});
