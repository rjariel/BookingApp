import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { env } from '@/env';

/**
 * Drizzle client over native Postgres driver (TCP).
 * Supports transactions for multi-step mutations (bookings, inventory, payments).
 * Slight cold-start overhead (~200-500ms) vs HTTP driver, but worth it for atomicity.
 */
const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });
export type Database = typeof db;
