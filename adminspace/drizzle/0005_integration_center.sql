CREATE TYPE "public"."integration_delivery_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_endpoint_kind" AS ENUM('slack', 'discord', 'teams', 'webhook', 'zapier', 'n8n');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('not_configured', 'pending', 'connected', 'error', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "automation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"token_prefix" varchar(16) NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid,
	"provider" varchar(32) NOT NULL,
	"status" "integration_status" DEFAULT 'not_configured' NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"external_account_id" varchar(200),
	"external_account_name" varchar(200),
	"access_token" text,
	"refresh_token" text,
	"secret" text,
	"expires_at" timestamp with time zone,
	"last_tested_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_error" varchar(300),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activity" jsonb,
	"refresh_locked_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_connections_provider_check" CHECK ("integration_connections"."provider" ~ '^[a-z0-9-]{2,32}$')
);
--> statement-breakpoint
CREATE TABLE "integration_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"status" "integration_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"response_status" integer,
	"last_error" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "integration_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "integration_endpoint_kind" NOT NULL,
	"name" varchar(200) NOT NULL,
	"url" text,
	"url_hint" varchar(200),
	"channel" varchar(100),
	"signing_secret" text,
	"event_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"disabled_reason" varchar(50),
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"last_error" varchar(300),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_endpoints_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"data" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_events_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "integration_inbound_events" (
	"provider" varchar(32) NOT NULL,
	"external_id" varchar(200) NOT NULL,
	"organization_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_inbound_events_provider_external_id_pk" PRIMARY KEY("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "integration_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" varchar(64) NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"personal" boolean NOT NULL,
	"code_verifier" text,
	"redirect_uri" text NOT NULL,
	"return_to" varchar(300) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_tokens" ADD CONSTRAINT "automation_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_tokens" ADD CONSTRAINT "automation_tokens_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_deliveries" ADD CONSTRAINT "integration_deliveries_endpoint_fk" FOREIGN KEY ("organization_id","endpoint_id") REFERENCES "public"."integration_endpoints"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_deliveries" ADD CONSTRAINT "integration_deliveries_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."integration_events"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_endpoints" ADD CONSTRAINT "integration_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_endpoints" ADD CONSTRAINT "integration_endpoints_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_inbound_events" ADD CONSTRAINT "integration_inbound_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_oauth_states" ADD CONSTRAINT "integration_oauth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_oauth_states" ADD CONSTRAINT "integration_oauth_states_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_tokens_hash_unique" ON "automation_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "automation_tokens_org_idx" ON "automation_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_org_provider_unique" ON "integration_connections" USING btree ("organization_id","provider") WHERE "integration_connections"."account_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_personal_unique" ON "integration_connections" USING btree ("organization_id","provider","account_id") WHERE "integration_connections"."account_id" is not null;--> statement-breakpoint
CREATE INDEX "integration_connections_account_idx" ON "integration_connections" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "integration_connections_external_idx" ON "integration_connections" USING btree ("provider","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_deliveries_endpoint_event_unique" ON "integration_deliveries" USING btree ("endpoint_id","event_id");--> statement-breakpoint
CREATE INDEX "integration_deliveries_org_created_idx" ON "integration_deliveries" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_deliveries_org_status_idx" ON "integration_deliveries" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "integration_endpoints_org_idx" ON "integration_endpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "integration_events_org_time_idx" ON "integration_events" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "integration_inbound_events_received_idx" ON "integration_inbound_events" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_oauth_states_hash_unique" ON "integration_oauth_states" USING btree ("state_hash");--> statement-breakpoint
CREATE INDEX "integration_oauth_states_expires_idx" ON "integration_oauth_states" USING btree ("expires_at");