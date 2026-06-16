import 'server-only';
import { db } from '@/db';
import { activityLog } from '@/db/schema';

export type ActivityInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: Record<string, unknown>;
};

/**
 * Append an audit row. Every mutating Server Action should call this
 * (ROADMAP cross-cutting "Audit"). Logging failures are swallowed so auditing
 * never breaks the primary write — revisit if audit must be transactional.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await db.insert(activityLog).values({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary ?? null,
    });
  } catch (error) {
    console.error('[activity-log] failed to write entry', error);
  }
}
