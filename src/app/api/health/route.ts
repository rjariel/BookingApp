import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness + DB round-trip. 200 when the database answers, 503 otherwise. */
export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok', db: 'up', checkedAt });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        db: 'down',
        checkedAt,
        message: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 503 },
    );
  }
}
