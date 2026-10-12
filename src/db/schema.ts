import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  date,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Better Auth core tables (field names match Better Auth's defaults)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const sourceEnum = pgEnum("data_source", ["manual", "demo", "garmin", "import", "claude"]);
export const glucoseTagEnum = pgEnum("glucose_tag", [
  "fasting",
  "before_meal",
  "after_meal",
  "bedtime",
  "other",
]);

const userRef = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const glucoseReadings = pgTable(
  "glucose_readings",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    valueMgdl: integer("value_mgdl").notNull(),
    tag: glucoseTagEnum("tag").notNull().default("other"),
    note: text("note"),
    mealId: text("meal_id"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("glucose_user_ts_idx").on(t.userId, t.ts)]
);

export const meals = pgTable(
  "meals",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    carbsG: real("carbs_g"),
    proteinG: real("protein_g"),
    fatG: real("fat_g"),
    fiberG: real("fiber_g"),
    calories: real("calories"),
    estimateConfidence: text("estimate_confidence"), // low | medium | high
    estimateNotes: text("estimate_notes"),
    notes: text("notes"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("meals_user_ts_idx").on(t.userId, t.ts)]
);

export const weightEntries = pgTable(
  "weight_entries",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    date: date("date").notNull(),
    weightLbs: real("weight_lbs").notNull(),
    bodyFatPct: real("body_fat_pct"),
    muscleMassLbs: real("muscle_mass_lbs"),
    bmi: real("bmi"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("weight_user_date_source_idx").on(t.userId, t.date, t.source)]
);

export const dexaScans = pgTable(
  "dexa_scans",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    date: date("date").notNull(),
    provider: text("provider"),
    totalBodyFatPct: real("total_body_fat_pct"),
    leanMassLbs: real("lean_mass_lbs"),
    fatMassLbs: real("fat_mass_lbs"),
    totalMassLbs: real("total_mass_lbs"),
    visceralFatLbs: real("visceral_fat_lbs"),
    visceralFatAreaCm2: real("visceral_fat_area_cm2"),
    boneDensityTScore: real("bone_density_t_score"),
    boneDensityZScore: real("bone_density_z_score"),
    androidGynoidRatio: real("android_gynoid_ratio"),
    regional: jsonb("regional").$type<Record<string, { fatPct?: number; leanLbs?: number; fatLbs?: number }>>(),
    filename: text("filename"),
    rawExtraction: jsonb("raw_extraction"),
    notes: text("notes"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("dexa_user_date_idx").on(t.userId, t.date)]
);

export const labReports = pgTable(
  "lab_reports",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    date: date("date").notNull(),
    provider: text("provider"),
    filename: text("filename"),
    rawExtraction: jsonb("raw_extraction"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("lab_reports_user_date_idx").on(t.userId, t.date)]
);

export const labResults = pgTable(
  "lab_results",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    reportId: text("report_id").references(() => labReports.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    marker: text("marker").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull().default(""),
    refMin: real("ref_min"),
    refMax: real("ref_max"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("lab_results_user_marker_idx").on(t.userId, t.marker, t.date)]
);

export const dailyHealth = pgTable(
  "daily_health",
  {
    id: text("id").primaryKey(),
    userId: userRef(),
    date: date("date").notNull(),
    steps: integer("steps"),
    activeMinutes: integer("active_minutes"),
    intensityMinutes: integer("intensity_minutes"),
    restingHr: integer("resting_hr"),
    hrvMs: integer("hrv_ms"),
    sleepHours: real("sleep_hours"),
    deepHours: real("deep_hours"),
    remHours: real("rem_hours"),
    lightHours: real("light_hours"),
    awakeHours: real("awake_hours"),
    sleepScore: integer("sleep_score"),
    avgStress: integer("avg_stress"),
    bodyBatteryHigh: integer("body_battery_high"),
    bodyBatteryLow: integer("body_battery_low"),
    calories: integer("calories"),
    source: sourceEnum("source").notNull().default("garmin"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_health_user_date_idx").on(t.userId, t.date)]
);

export const garminConnections = pgTable("garmin_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  encryptedTokenBlob: text("encrypted_token_blob").notNull(),
  garminDisplayName: text("garmin_display_name"),
  garminEmail: text("garmin_email"),
  status: text("status").notNull().default("connected"), // connected | needs_reauth | error
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  targetFastingMgdl: integer("target_fasting_mgdl").notNull().default(100),
  targetPostMealMgdl: integer("target_post_meal_mgdl").notNull().default(140),
  targetSteps: integer("target_steps").notNull().default(7000),
  targetSleepHours: real("target_sleep_hours").notNull().default(7),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GlucoseReading = typeof glucoseReadings.$inferSelect;
export type NewGlucoseReading = typeof glucoseReadings.$inferInsert;
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type DexaScan = typeof dexaScans.$inferSelect;
export type NewDexaScan = typeof dexaScans.$inferInsert;
export type LabResult = typeof labResults.$inferSelect;
export type LabReport = typeof labReports.$inferSelect;
export type DailyHealth = typeof dailyHealth.$inferSelect;
export type NewDailyHealth = typeof dailyHealth.$inferInsert;
export type GarminConnection = typeof garminConnections.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type DataSource = (typeof sourceEnum.enumValues)[number];
export type GlucoseTag = (typeof glucoseTagEnum.enumValues)[number];
