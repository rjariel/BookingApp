CREATE TYPE "public"."cash_advance_type" AS ENUM('advance', 'repayment');--> statement-breakpoint
CREATE TABLE "cash_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"staff_id" uuid NOT NULL,
	"type" "cash_advance_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"recorded_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;