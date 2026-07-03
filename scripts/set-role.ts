/**
 * Update an existing user's role.
 *
 * Usage:
 *   npm run set-role <email> <role>
 *
 * Role options: admin | staff
 *
 * Examples:
 *   npm run set-role rey@example.com admin
 *   npm run set-role staff@example.com staff
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/db/schema';

const [, , email, roleArg] = process.argv;

if (!email || !roleArg) {
  console.error('Usage: npm run set-role <email> <role>');
  console.error('Role options: admin | staff');
  process.exit(1);
}

if (roleArg !== 'admin' && roleArg !== 'staff') {
  console.error(`Invalid role "${roleArg}". Must be: admin | staff`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

const role = roleArg as 'admin' | 'staff';

void (async () => {
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`User ${email} is already ${role}. Nothing done.`);
    process.exit(0);
  }

  await db.update(users).set({ role }).where(eq(users.id, user.id));

  console.log(`✓ ${email} role updated to ${role} (id: ${user.id})`);
})();
