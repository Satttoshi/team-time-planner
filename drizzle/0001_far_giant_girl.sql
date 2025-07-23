ALTER TABLE "players" ADD COLUMN "role" text DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "sort_order" integer DEFAULT 1 NOT NULL;