ALTER TYPE "public"."inbound_email_source" ADD VALUE 'mailbox';--> statement-breakpoint
CREATE TABLE "mailbox_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 993 NOT NULL,
	"encrypted_password" text NOT NULL,
	"folder" text DEFAULT 'INBOX' NOT NULL,
	"extra_senders" text DEFAULT '' NOT NULL,
	"uid_validity" text,
	"last_uid" integer,
	"last_checked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailbox_connections" ADD CONSTRAINT "mailbox_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_connections_user_idx" ON "mailbox_connections" USING btree ("user_id");