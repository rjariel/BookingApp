import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Full forward-compatible schema (all roadmap phases).
 * Phases 2-7 read/write these tables; Phase 0 just creates them.
 * Money is numeric(10,2); time is stored UTC (timestamptz).
 */

// ── Enums ──────────────────────────────────────────────────────────────
// `client` is included now so adding self-service login later needs no enum migration.
export const userRole = pgEnum('user_role', ['admin', 'staff', 'client']);
export const moduleSlug = pgEnum('module_slug', [
  'dashboard',
  'bookings',
  'inventory',
  'packages',
  'addons',
  'payment_modes',
  'expense_types',
  'expenses',
  'cashflow',
  'settings',
  'activity_log',
  'employees',
  'duty',
]);
export const salaryType = pgEnum('salary_type', ['monthly', 'daily', 'hourly']);
export const bookingStatus = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);
export const paymentStatus = pgEnum('payment_status', ['unpaid', 'partial', 'paid']);
export const stockLedgerType = pgEnum('stock_ledger_type', [
  'usage',
  'restock',
  'adjustment',
  'wastage',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// ── Roles (RBAC) ──────────────────────────────────────────────────────
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  /** Ties this role to the admin/staff/client tier for auth guards. */
  baseRole: userRole('base_role').notNull().default('staff'),
  /** System roles (Administrator, Staff, Client) cannot be deleted. */
  isSystem: boolean('is_system').notNull().default(false),
  /** Hex color for the badge, e.g. "#6366f1". */
  color: text('color').notNull().default('#6b7280'),
  ...timestamps,
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    module: moduleSlug('module').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.roleId, t.module)],
);

// ── Identity ───────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: userRole('role').notNull().default('staff'),
  /** FK to roles table; null means use base role defaults. */
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

/** @deprecated — replaced by role_permissions. Kept for safe migration. */
export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  module: moduleSlug('module').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  // Nullable now; attaches to an auth user when client login ships.
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

// ── Catalog ────────────────────────────────────────────────────────────
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  description: text('description'),
  quantity: integer('quantity').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(0),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  durationMin: integer('duration_min').notNull().default(60),
  details: text('details'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

export const packageItems = pgTable('package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'restrict' }),
  qty: integer('qty').notNull().default(1),
  ...timestamps,
});

export const addons = pgTable('addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  // NULL = global add-on; set = custom add-on for that package
  packageId: uuid('package_id').references(() => packages.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

export const packageAddons = pgTable('package_addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  addonId: uuid('addon_id')
    .notNull()
    .references(() => addons.id, { onDelete: 'cascade' }),
});

export const paymentModes = pgTable('payment_modes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const expenseTypes = pgTable('expense_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isInventoryPurchase: boolean('is_inventory_purchase').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Bookings ───────────────────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'restrict' }),
  // Resource for the double-booking exclusion constraint (added in the migration).
  staffId: uuid('staff_id').references(() => users.id, { onDelete: 'set null' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: bookingStatus('status').notNull().default('pending'),
  amountTotal: numeric('amount_total', { precision: 10, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
  paymentModeId: uuid('payment_mode_id').references(() => paymentModes.id, {
    onDelete: 'set null',
  }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const bookingAddons = pgTable('booking_addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  addonId: uuid('addon_id')
    .notNull()
    .references(() => addons.id, { onDelete: 'restrict' }),
  qty: integer('qty').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
});

export const bookingItems = pgTable('booking_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'restrict' }),
  qty: integer('qty').notNull().default(1),
});

// ── Finance ────────────────────────────────────────────────────────────
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseTypeId: uuid('expense_type_id')
    .notNull()
    .references(() => expenseTypes.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentModeId: uuid('payment_mode_id').references(() => paymentModes.id, {
    onDelete: 'set null',
  }),
  spentOn: date('spent_on').notNull(),
  description: text('description'),
  // Set on inventory-purchase expenses; pairs with qty to restock.
  inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id, {
    onDelete: 'set null',
  }),
  qty: integer('qty'),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stockLedger = pgTable('stock_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  type: stockLedgerType('type').notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  staffId: uuid('staff_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Cash Flow ─────────────────────────────────────────────────────────
// One report per staff per day — their EOD cash count.
export const cashReports = pgTable('cash_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  amountReported: numeric('amount_reported', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Cash leaving the studio (bank deposit, owner withdrawal, etc.) — admin only.
export const cashWithdrawals = pgTable('cash_withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  withdrawnBy: uuid('withdrawn_by').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Cash coming in — manually logged by whoever collected it. Fully decoupled
// from `bookings.amount_paid`; this table is the source of truth for cash flow.
export const cashIncome = pgTable('cash_income', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  source: text('source').notNull(),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Auth tokens ───────────────────────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Audit ──────────────────────────────────────────────────────────────
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  summary: jsonb('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Global store settings — always a single row (upsert on save).
 * open_time / close_time stored as "HH:MM" (24h, local studio time).
 */
export const storeSettings = pgTable('store_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  studioName: text('studio_name').notNull().default('My Studio'),
  logoUrl: text('logo_url'), // base64 data URL or remote URL
  openTime: text('open_time').notNull().default('09:00'),
  closeTime: text('close_time').notNull().default('18:00'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type StoreSettings = typeof storeSettings.$inferSelect;

// ── Employees ──────────────────────────────────────────────────────────
// One-to-one extension of users for staff HR/salary info.
export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  photo: text('photo'), // base64 data URL or remote URL
  position: text('position'),
  details: text('details'), // general info visible to all
  salary: numeric('salary', { precision: 10, scale: 2 }),
  salaryType: salaryType('salary_type').default('monthly'),
  hireDate: date('hire_date'),
  notes: text('notes'), // admin-only internal notes
  ...timestamps,
});

// ── Daily duty ─────────────────────────────────────────────────────────
// Who is on duty for a given day. Staff adds self; admin can update.
export const dailyDuty = pgTable(
  'daily_duty',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    notes: text('notes'),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [unique('uq_duty_user_date').on(t.userId, t.date)],
);

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;
export type DailyDuty = typeof dailyDuty.$inferSelect;
export type NewDailyDuty = typeof dailyDuty.$inferInsert;

// ── Relations (query builder) ──────────────────────────────────────────
export const rolesRelations = relations(roles, ({ many }) => ({
  assignedUsers: many(users),
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  assignedRole: one(roles, { fields: [users.roleId], references: [roles.id] }),
  bookingsCreated: many(bookings),
  permissions: many(userPermissions),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(clients, { fields: [bookings.clientId], references: [clients.id] }),
  package: one(packages, { fields: [bookings.packageId], references: [packages.id] }),
  staff: one(users, { fields: [bookings.staffId], references: [users.id] }),
  paymentMode: one(paymentModes, {
    fields: [bookings.paymentModeId],
    references: [paymentModes.id],
  }),
  addons: many(bookingAddons),
  items: many(bookingItems),
}));

export const bookingAddonsRelations = relations(bookingAddons, ({ one }) => ({
  booking: one(bookings, { fields: [bookingAddons.bookingId], references: [bookings.id] }),
  addon: one(addons, { fields: [bookingAddons.addonId], references: [addons.id] }),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  item: one(inventoryItems, { fields: [bookingItems.itemId], references: [inventoryItems.id] }),
}));

export const packageItemsRelations = relations(packageItems, ({ one }) => ({
  package: one(packages, { fields: [packageItems.packageId], references: [packages.id] }),
  item: one(inventoryItems, { fields: [packageItems.itemId], references: [inventoryItems.id] }),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  items: many(packageItems),
  addons: many(packageAddons),
  customAddons: many(addons),
}));

export const addonsRelations = relations(addons, ({ one, many }) => ({
  package: one(packages, { fields: [addons.packageId], references: [packages.id] }),
  packageLinks: many(packageAddons),
}));

export const packageAddonsRelations = relations(packageAddons, ({ one }) => ({
  package: one(packages, { fields: [packageAddons.packageId], references: [packages.id] }),
  addon: one(addons, { fields: [packageAddons.addonId], references: [addons.id] }),
}));

export const cashReportsRelations = relations(cashReports, ({ one }) => ({
  staff: one(users, { fields: [cashReports.staffId], references: [users.id] }),
}));

export const cashWithdrawalsRelations = relations(cashWithdrawals, ({ one }) => ({
  withdrawnByUser: one(users, { fields: [cashWithdrawals.withdrawnBy], references: [users.id] }),
}));

export const cashIncomeRelations = relations(cashIncome, ({ one }) => ({
  recordedByUser: one(users, { fields: [cashIncome.recordedBy], references: [users.id] }),
}));

export const employeeProfilesRelations = relations(employeeProfiles, ({ one }) => ({
  user: one(users, { fields: [employeeProfiles.userId], references: [users.id] }),
}));

export const dailyDutyRelations = relations(dailyDuty, ({ one }) => ({
  user: one(users, { fields: [dailyDuty.userId], references: [users.id] }),
  updatedByUser: one(users, { fields: [dailyDuty.updatedBy], references: [users.id] }),
}));

// ── Inferred types ─────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
export type PackageItem = typeof packageItems.$inferSelect;
export type NewPackageItem = typeof packageItems.$inferInsert;
export type Addon = typeof addons.$inferSelect;
export type NewAddon = typeof addons.$inferInsert;
export type PackageAddon = typeof packageAddons.$inferSelect;
export type NewPackageAddon = typeof packageAddons.$inferInsert;

// Module list for permissions (matches moduleSlug enum)
export const ALL_MODULES = [
  'dashboard',
  'bookings',
  'inventory',
  'packages',
  'addons',
  'payment_modes',
  'expense_types',
  'expenses',
  'cashflow',
  'settings',
  'activity_log',
  'employees',
  'duty',
] as const;

export const MODULE_LABELS: Record<(typeof ALL_MODULES)[number], string> = {
  dashboard: '📊 Dashboard',
  bookings: '📅 Bookings',
  inventory: '📦 Inventory',
  packages: '🎁 Packages',
  addons: '⭐ Add-ons',
  payment_modes: '💳 Payment Modes',
  expense_types: '🏷️ Expense Types',
  expenses: '💰 Expenses',
  cashflow: '💵 Cash Flow',
  settings: '⚙️ Settings',
  activity_log: '📋 Activity Log',
  employees: '👥 Employees',
  duty: '🗓️ Duty',
};

export type CashReport = typeof cashReports.$inferSelect;
export type NewCashReport = typeof cashReports.$inferInsert;
export type CashWithdrawal = typeof cashWithdrawals.$inferSelect;
export type CashIncome = typeof cashIncome.$inferSelect;
export type NewCashIncome = typeof cashIncome.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
