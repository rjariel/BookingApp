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

// ── Identity ───────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: userRole('role').notNull().default('staff'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
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

export const addons = pgTable('addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
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

// ── Relations (query builder) ──────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  bookingsCreated: many(bookings),
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

// ── Inferred types ─────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
