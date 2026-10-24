/** Applies pending SQL migrations from ./drizzle. Run before starting a new version. */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "../src/lib/server/db/client";

await migrate(db(), { migrationsFolder: "./drizzle" });
console.info("Database migrations applied.");
await closeDb();
