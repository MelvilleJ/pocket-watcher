CREATE TYPE "public"."depo_kind" AS ENUM('cash', 'bank', 'credit_union', 'wallet', 'other');--> statement-breakpoint
CREATE TABLE "depo_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_depo_id" uuid NOT NULL,
	"to_depo_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "depos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "depo_kind" DEFAULT 'bank' NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "depo_id" uuid;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "depo_id" uuid;--> statement-breakpoint
ALTER TABLE "depo_transfers" ADD CONSTRAINT "depo_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depo_transfers" ADD CONSTRAINT "depo_transfers_from_depo_id_depos_id_fk" FOREIGN KEY ("from_depo_id") REFERENCES "public"."depos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depo_transfers" ADD CONSTRAINT "depo_transfers_to_depo_id_depos_id_fk" FOREIGN KEY ("to_depo_id") REFERENCES "public"."depos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depos" ADD CONSTRAINT "depos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "depo_transfers_user_date_idx" ON "depo_transfers" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "depo_transfers_client_idx" ON "depo_transfers" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "depos_user_idx" ON "depos" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "depos_client_idx" ON "depos" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "depos_user_name_idx" ON "depos" USING btree ("user_id","name") WHERE "depos"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_depo_id_depos_id_fk" FOREIGN KEY ("depo_id") REFERENCES "public"."depos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_depo_id_depos_id_fk" FOREIGN KEY ("depo_id") REFERENCES "public"."depos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_depo_idx" ON "expenses" USING btree ("depo_id");--> statement-breakpoint
CREATE INDEX "income_depo_idx" ON "income" USING btree ("depo_id");
