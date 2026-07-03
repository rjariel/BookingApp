/**
 * Create a user with a specific role (default: staff).
 *
 * Usage:
 *   npm run create-user <email> <name> <password> [role]
 *
 * Role options: admin | staff  (defaults to "staff")
 *
 * Examples:
 *   npm run create-user staff@example.com "Jane Doe" "p4ssword"
 *   npm run create-user boss@example.com "Boss Man" "p4ssword" admin
 */

import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/db/schema';

const [, , email, name, password, roleArg] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-user <email> <name> <password> [role]');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

const role = roleArg === 'admin' ? 'admin' : 'staff';

void (async () => {
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id}). Nothing done.`);
    process.exit(0);
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const [created] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name: name ?? email,
      passwordHash,
      role,
      active: true,
    })
    .returning({ id: users.id });

  console.log(`✓ ${role} created: ${email} (id: ${created?.id})`);
})();
