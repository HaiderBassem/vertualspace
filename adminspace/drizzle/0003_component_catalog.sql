-- Office component catalog: content-addressed assets, components, immutable versions, installations
-- per world, favorites, organization collections; room synchronization state for map-storage changes.
CREATE TYPE "public"."component_kind" AS ENUM('entity', 'room_template');--> statement-breakpoint
CREATE TYPE "public"."component_status" AS ENUM('draft', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."room_sync_state" AS ENUM('ready', 'pending', 'failed');--> statement-breakpoint
CREATE TABLE "assets" (
	"sha256" varchar(64) PRIMARY KEY NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_collection_items" (
	"collection_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "component_collection_items_collection_id_component_id_pk" PRIMARY KEY("collection_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "component_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_favorites" (
	"account_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "component_favorites_account_id_component_id_pk" PRIMARY KEY("account_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "component_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"installed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_version_assets" (
	"version_id" uuid NOT NULL,
	"path" varchar(200) NOT NULL,
	"sha256" varchar(64) NOT NULL,
	CONSTRAINT "component_version_assets_version_id_path_pk" PRIMARY KEY("version_id","path")
);
--> statement-breakpoint
CREATE TABLE "component_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"version" varchar(32) NOT NULL,
	"manifest" jsonb NOT NULL,
	"manifest_hash" varchar(64) NOT NULL,
	"validation" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"organization_id" uuid,
	"kind" "component_kind" NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(64) NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "component_status" DEFAULT 'draft' NOT NULL,
	"license" varchar(100) NOT NULL,
	"attribution" text,
	"provenance" text NOT NULL,
	"publisher" varchar(200) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "sync_state" "room_sync_state" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "collection_linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "template_version_id" uuid;--> statement-breakpoint
ALTER TABLE "component_collection_items" ADD CONSTRAINT "component_collection_items_collection_id_component_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."component_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_collection_items" ADD CONSTRAINT "component_collection_items_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_collections" ADD CONSTRAINT "component_collections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_collections" ADD CONSTRAINT "component_collections_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_favorites" ADD CONSTRAINT "component_favorites_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_favorites" ADD CONSTRAINT "component_favorites_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_installations" ADD CONSTRAINT "component_installations_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_installations" ADD CONSTRAINT "component_installations_version_id_component_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."component_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_installations" ADD CONSTRAINT "component_installations_installed_by_accounts_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_org_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "component_installations" ADD CONSTRAINT "component_installations_world_fk" FOREIGN KEY ("organization_id","world_id") REFERENCES "public"."worlds"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_version_assets" ADD CONSTRAINT "component_version_assets_version_id_component_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."component_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_version_assets" ADD CONSTRAINT "component_version_assets_sha256_assets_sha256_fk" FOREIGN KEY ("sha256") REFERENCES "public"."assets"("sha256") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_versions" ADD CONSTRAINT "component_versions_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_versions" ADD CONSTRAINT "component_versions_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "component_collections_org_name_unique" ON "component_collections" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "component_installations_world_component_unique" ON "component_installations" USING btree ("world_id","component_id");--> statement-breakpoint
CREATE INDEX "component_installations_org_idx" ON "component_installations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "component_version_assets_sha_idx" ON "component_version_assets" USING btree ("sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "component_versions_unique" ON "component_versions" USING btree ("component_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "components_platform_key_unique" ON "components" USING btree ("key") WHERE "components"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "components_org_key_unique" ON "components" USING btree ("organization_id","key") WHERE "components"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX "components_category_idx" ON "components" USING btree ("category");--> statement-breakpoint
CREATE INDEX "components_search_idx" ON "components" USING gin (to_tsvector('simple', "name" || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "components_tags_idx" ON "components" USING gin ("tags");
