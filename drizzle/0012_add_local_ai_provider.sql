ALTER TYPE "public"."ai_provider" ADD VALUE 'local';--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "base_url" text;