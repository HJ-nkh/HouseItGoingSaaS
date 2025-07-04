ALTER TABLE "drawings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "deleted_at" timestamp;