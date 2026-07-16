ALTER TABLE "booking_addons" DROP CONSTRAINT "booking_addons_payment_mode_id_payment_modes_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "addons_amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "addons_payment_mode_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_addons_payment_mode_id_payment_modes_id_fk" FOREIGN KEY ("addons_payment_mode_id") REFERENCES "public"."payment_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" DROP COLUMN "payment_mode_id";