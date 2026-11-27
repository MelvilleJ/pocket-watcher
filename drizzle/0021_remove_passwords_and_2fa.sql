DROP TABLE "auth_two_factors" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_enabled";--> statement-breakpoint
-- Sign-in is passwordless now; remove the stored password hashes.
DELETE FROM "auth_accounts" WHERE "provider_id" = 'credential';
