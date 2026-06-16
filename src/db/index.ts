import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';
import { env } from '@/env';

/**
 * Drizzle client over Neon's HTTP driver — ideal for serverless/edge reads
 * and single-statement writes. For multi-statement transactions in later
 * phases, switch to the WebSocket Pool driver (`drizzle-orm/neon-serverless`).
 */
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
