CREATE TABLE "goal_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "goal_id" uuid NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "description" text,
  "amount" numeric(12, 2) NOT NULL,
  "notes" text,
  "client_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "goal_payments" ADD CONSTRAINT "goal_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goal_payments" ADD CONSTRAINT "goal_payments_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "goal_payments_user_idx" ON "goal_payments" USING btree ("user_id");
CREATE INDEX "goal_payments_goal_idx" ON "goal_payments" USING btree ("goal_id");
CREATE UNIQUE INDEX "goal_payments_client_idx" ON "goal_payments" USING btree ("user_id", "client_id");
