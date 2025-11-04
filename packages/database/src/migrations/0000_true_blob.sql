CREATE TABLE "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"espn_league_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"espn_s2_cookie" text,
	"swid_cookie" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "leagues_espn_league_id_unique" UNIQUE("espn_league_id")
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"espn_owner_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "owners_espn_owner_id_unique" UNIQUE("espn_owner_id")
);
--> statement-breakpoint
CREATE TABLE "league_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "league_seasons_league_id_year_unique" UNIQUE("league_id","year")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_season_id" uuid NOT NULL,
	"owner_id" uuid,
	"espn_team_id" integer NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"abbreviation" varchar(10),
	"logo_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "teams_league_season_id_espn_team_id_unique" UNIQUE("league_season_id","espn_team_id")
);
--> statement-breakpoint
CREATE TABLE "matchups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_season_id" uuid NOT NULL,
	"matchup_period" integer NOT NULL,
	"scoring_period" integer NOT NULL,
	"home_team_id" uuid NOT NULL,
	"home_score" numeric(10, 2) NOT NULL,
	"away_team_id" uuid NOT NULL,
	"away_score" numeric(10, 2) NOT NULL,
	"is_playoffs" boolean DEFAULT false NOT NULL,
	"is_championship" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "chk_different_teams" CHECK ("matchups"."home_team_id" != "matchups"."away_team_id"),
	CONSTRAINT "chk_positive_scores" CHECK ("matchups"."home_score" >= 0 AND "matchups"."away_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "all_time_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"record_type" varchar(100) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"holder_owner_id" uuid,
	"holder_team_id" uuid,
	"holder_display_name" varchar(255),
	"season_year" integer,
	"week" integer,
	"opponent_team_id" uuid,
	"opponent_display_name" varchar(255),
	"metadata" jsonb,
	"last_computed_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "all_time_records_league_id_record_type_unique" UNIQUE("league_id","record_type")
);
--> statement-breakpoint
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_season_id_league_seasons_id_fk" FOREIGN KEY ("league_season_id") REFERENCES "public"."league_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_league_season_id_league_seasons_id_fk" FOREIGN KEY ("league_season_id") REFERENCES "public"."league_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "all_time_records" ADD CONSTRAINT "all_time_records_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "all_time_records" ADD CONSTRAINT "all_time_records_holder_owner_id_owners_id_fk" FOREIGN KEY ("holder_owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "all_time_records" ADD CONSTRAINT "all_time_records_holder_team_id_teams_id_fk" FOREIGN KEY ("holder_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "all_time_records" ADD CONSTRAINT "all_time_records_opponent_team_id_teams_id_fk" FOREIGN KEY ("opponent_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;