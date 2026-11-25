CREATE TABLE "merchant_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"merchant_key" text NOT NULL,
	"display_name" text,
	"category_name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD COLUMN "original_description" text;--> statement-breakpoint
ALTER TABLE "pending_transactions" ADD COLUMN "category_source" text;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_user_key_idx" ON "merchant_rules" USING btree ("user_id","kind","merchant_key");