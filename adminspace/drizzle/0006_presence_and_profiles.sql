CREATE TABLE "member_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"job_title" varchar(200),
	"department" varchar(200),
	"work_location" varchar(200),
	"manager_id" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_profiles_email_lower_check" CHECK ("member_profiles"."email" = lower("member_profiles"."email")),
	CONSTRAINT "member_profiles_manager_check" CHECK ("member_profiles"."manager_id" is null or "member_profiles"."manager_id" <> "member_profiles"."id")
);
--> statement-breakpoint
CREATE TABLE "presence_reports" (
	"instance_id" varchar(200) PRIMARY KEY NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"users" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_manager_id_member_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."member_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_org_email_unique" ON "member_profiles" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "member_profiles_org_department_idx" ON "member_profiles" USING btree ("organization_id","department");--> statement-breakpoint
CREATE INDEX "member_profiles_manager_idx" ON "member_profiles" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "presence_reports_expires_idx" ON "presence_reports" USING btree ("expires_at");