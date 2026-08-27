ALTER TABLE "income" ADD COLUMN "applied_month" text;
CREATE INDEX "income_user_applied_month_idx" ON "income" USING btree ("user_id", "applied_month");
