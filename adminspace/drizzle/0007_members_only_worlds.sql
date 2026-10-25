ALTER TABLE "worlds" ALTER COLUMN "access_policy" SET DEFAULT 'members';--> statement-breakpoint
UPDATE "worlds" SET "access_policy" = 'members' WHERE "access_policy" = 'public';
