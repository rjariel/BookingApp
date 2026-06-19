-- Migration 0012: Role-based access control
-- Idempotent — safe to re-run if a previous attempt partially failed.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "base_role" "user_role" NOT NULL DEFAULT 'staff',
  "is_system" boolean NOT NULL DEFAULT false,
  "color" text NOT NULL DEFAULT '#6b7280',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "roles_name_unique" UNIQUE("name"),
  CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "module" "module_slug" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "role_permissions_role_id_module_unique" UNIQUE("role_id", "module")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" uuid REFERENCES "roles"("id") ON DELETE SET NULL;
--> statement-breakpoint
INSERT INTO "roles" ("name", "slug", "description", "base_role", "is_system", "color")
VALUES
  ('Administrator', 'administrator', 'Full access to all modules.', 'admin', true, '#dc2626'),
  ('Staff', 'staff', 'Default access for general staff members.', 'staff', true, '#2563eb'),
  ('Client', 'client', 'For clients with self-service portal access.', 'client', true, '#16a34a')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "module")
SELECT r.id, unnest(ARRAY[
  'dashboard','bookings','inventory','packages','addons',
  'payment_modes','expense_types','expenses','cashflow',
  'settings','activity_log','employees','duty'
]::module_slug[])
FROM "roles" r
WHERE r.slug = 'administrator'
ON CONFLICT ("role_id", "module") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "module")
SELECT r.id, unnest(ARRAY[
  'dashboard','bookings','inventory','packages','addons','cashflow','duty'
]::module_slug[])
FROM "roles" r
WHERE r.slug = 'staff'
ON CONFLICT ("role_id", "module") DO NOTHING;
--> statement-breakpoint
UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE u.role = 'admin' AND r.slug = 'administrator' AND u.role_id IS NULL;
--> statement-breakpoint
UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE u.role = 'staff' AND r.slug = 'staff' AND u.role_id IS NULL;
--> statement-breakpoint
UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE u.role = 'client' AND r.slug = 'client' AND u.role_id IS NULL;
