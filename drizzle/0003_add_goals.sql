CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "target_amount" numeric(12, 2) NOT NULL,
  "current_saved" numeric(12, 2) NOT NULL DEFAULT '0',
  "min_monthly_contribution" numeric(12, 2) NOT NULL DEFAULT '0',
  "notes" text,
  "client_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");
CREATE UNIQUE INDEX "goals_client_idx" ON "goals" USING btree ("user_id","client_id");
CREATE UNIQUE INDEX "goals_user_name_idx" ON "goals" USING btree ("user_id","name");
