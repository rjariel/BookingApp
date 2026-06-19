CREATE TABLE "store_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"open_time" text DEFAULT '09:00' NOT NULL,
	"close_time" text DEFAULT '18:00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
