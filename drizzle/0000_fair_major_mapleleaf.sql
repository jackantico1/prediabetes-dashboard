CREATE TYPE "public"."glucose_tag" AS ENUM('fasting', 'before_meal', 'after_meal', 'bedtime', 'other');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('manual', 'demo', 'garmin', 'import', 'claude');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_health" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"steps" integer,
	"active_minutes" integer,
	"intensity_minutes" integer,
	"resting_hr" integer,
	"hrv_ms" integer,
	"sleep_hours" real,
	"deep_hours" real,
	"rem_hours" real,
	"light_hours" real,
	"awake_hours" real,
	"sleep_score" integer,
	"avg_stress" integer,
	"body_battery_high" integer,
	"body_battery_low" integer,
	"calories" integer,
	"source" "data_source" DEFAULT 'garmin' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dexa_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"provider" text,
	"total_body_fat_pct" real,
	"lean_mass_lbs" real,
	"fat_mass_lbs" real,
	"total_mass_lbs" real,
	"visceral_fat_lbs" real,
	"visceral_fat_area_cm2" real,
	"bone_density_t_score" real,
	"bone_density_z_score" real,
	"android_gynoid_ratio" real,
	"regional" jsonb,
	"filename" text,
	"raw_extraction" jsonb,
	"notes" text,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garmin_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"encrypted_token_blob" text NOT NULL,
	"garmin_display_name" text,
	"garmin_email" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glucose_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"value_mgdl" integer NOT NULL,
	"tag" "glucose_tag" DEFAULT 'other' NOT NULL,
	"note" text,
	"meal_id" text,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"provider" text,
	"filename" text,
	"raw_extraction" jsonb,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"report_id" text,
	"date" date NOT NULL,
	"marker" text NOT NULL,
	"value" real NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"ref_min" real,
	"ref_max" real,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"carbs_g" real,
	"protein_g" real,
	"fat_g" real,
	"fiber_g" real,
	"calories" real,
	"estimate_confidence" text,
	"estimate_notes" text,
	"notes" text,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_fasting_mgdl" integer DEFAULT 100 NOT NULL,
	"target_post_meal_mgdl" integer DEFAULT 140 NOT NULL,
	"target_steps" integer DEFAULT 7000 NOT NULL,
	"target_sleep_hours" real DEFAULT 7 NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"weight_lbs" real NOT NULL,
	"body_fat_pct" real,
	"muscle_mass_lbs" real,
	"bmi" real,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_health" ADD CONSTRAINT "daily_health_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dexa_scans" ADD CONSTRAINT "dexa_scans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_connections" ADD CONSTRAINT "garmin_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_report_id_lab_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."lab_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_health_user_date_idx" ON "daily_health" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "dexa_user_date_idx" ON "dexa_scans" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "glucose_user_ts_idx" ON "glucose_readings" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "lab_reports_user_date_idx" ON "lab_reports" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "lab_results_user_marker_idx" ON "lab_results" USING btree ("user_id","marker","date");--> statement-breakpoint
CREATE INDEX "meals_user_ts_idx" ON "meals" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_user_date_source_idx" ON "weight_entries" USING btree ("user_id","date","source");