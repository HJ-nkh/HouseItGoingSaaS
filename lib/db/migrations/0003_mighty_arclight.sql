ALTER TABLE "drawings" DROP CONSTRAINT "drawings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "drawings" ADD COLUMN "team_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "team_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "team_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
-- Remove the default values after adding the columns
ALTER TABLE "drawings" ALTER COLUMN "team_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "team_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "simulations" ALTER COLUMN "team_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawings" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "simulations" DROP COLUMN "user_id";