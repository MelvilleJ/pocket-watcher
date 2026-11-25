CREATE TYPE "public"."template_outcome" AS ENUM('transaction', 'declined');--> statement-breakpoint
ALTER TYPE "public"."inbound_email_status" ADD VALUE 'skipped';--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last4" text NOT NULL,
	"name" text NOT NULL,
	"depo_id" uuid,
	"decline_fee" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "outcome" "template_outcome" DEFAULT 'transaction' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "must_contain" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_depo_id_depos_id_fk" FOREIGN KEY ("depo_id") REFERENCES "public"."depos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cards_user_last4_idx" ON "cards" USING btree ("user_id","last4");