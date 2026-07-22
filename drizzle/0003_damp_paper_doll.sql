ALTER TABLE "match_documents" ADD COLUMN "match_date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "match_documents" SET "match_date" = "created_at";