CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google', 'openrouter');--> statement-breakpoint
CREATE TYPE "public"."entry_kind" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."inbound_email_source" AS ENUM('paste', 'forward');--> statement-breakpoint
CREATE TYPE "public"."inbound_email_status" AS ENUM('parsed', 'unmatched', 'failed');--> statement-breakpoint
CREATE TYPE "public"."parse_method" AS ENUM('template', 'ai');--> statement-breakpoint
CREATE TYPE "public"."pending_status" AS ENUM('pending', 'approved', 'dismissed');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_last4" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_ingest_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"sender_pattern" text NOT NULL,
	"subject_pattern" text,
	"rules" jsonb NOT NULL,
	"default_depo_id" uuid,
	"default_category_name" text,
	"auto_approve" boolean DEFAULT false NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"source" "inbound_email_source" NOT NULL,
	"from_address" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text,
	"status" "inbound_email_status" NOT NULL,
	"template_id" uuid,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inbound_email_id" uuid NOT NULL,
	"template_id" uuid,
	"kind" "entry_kind" NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"category_name" text,
	"depo_id" uuid,
	"parse_method" "parse_method" NOT NULL,
	"possible_duplicate" boolean DEFAULT false NOT NULL,
	"status" "pending_status" DEFAULT 'pending' NOT NULL,
	"created_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_ingest_addresses" ADD CONSTRAINT "email_ingest_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_default_depo_id_depos_id_fk" FOREIGN KEY ("default_depo_id") REFERENCES "public"."depos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD CONSTRAINT "pending_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD CONSTRAINT "pending_transactions_inbound_email_id_inbound_emails_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD CONSTRAINT "pending_transactions_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD CONSTRAINT "pending_transactions_depo_id_depos_id_fk" FOREIGN KEY ("depo_id") REFERENCES "public"."depos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_settings_user_idx" ON "ai_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_ingest_user_idx" ON "email_ingest_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_ingest_token_idx" ON "email_ingest_addresses" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_templates_user_idx" ON "email_templates" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_emails_message_idx" ON "inbound_emails" USING btree ("user_id","message_id");--> statement-breakpoint
CREATE INDEX "inbound_emails_user_received_idx" ON "inbound_emails" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "pending_transactions_user_status_idx" ON "pending_transactions" USING btree ("user_id","status");