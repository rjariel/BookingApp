ALTER TABLE "store_settings" ADD COLUMN "opening_balance" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "opening_balance_date" date;