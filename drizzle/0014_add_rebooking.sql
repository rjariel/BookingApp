ALTER TYPE "public"."booking_status" ADD VALUE 'rebooked';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rebooked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rebooked_from_id_bookings_id_fk" FOREIGN KEY ("rebooked_from_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- A rebooked original no longer holds its calendar slot, same as cancelled.
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_no_overlap";--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist ("staff_id" WITH =, tstzrange("starts_at", "ends_at") WITH &&) WHERE ("status" <> 'cancelled' AND "status" <> 'rebooked' AND "staff_id" IS NOT NULL);