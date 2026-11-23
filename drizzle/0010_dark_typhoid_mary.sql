ALTER TYPE "public"."audit_action" ADD VALUE 'export';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'import';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'account_deletion';--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;