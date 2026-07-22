CREATE TABLE "match_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'Untitled match plan' NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"presence" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_active" integer DEFAULT 1 NOT NULL;