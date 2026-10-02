ALTER TABLE "expenses" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "payments_tracked_from" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_subscription_date_idx" ON "expenses" USING btree ("subscription_id","date");