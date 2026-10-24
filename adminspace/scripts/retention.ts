/** Applies data retention now (the server also does it hourly). Usage: npm run retention:run */
import { closeDb } from "../src/lib/server/db/client";
import { runRetention } from "../src/lib/server/services/retention";

const report = await runRetention();
console.info(
    `Retention applied: ${report.guestsDeleted} guests, ${report.analyticsDeleted} analytics events, ` +
        `${report.sessionsDeleted} expired sessions deleted.`,
);
await closeDb();
