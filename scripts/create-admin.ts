/**
 * Bootstrap the first admin user.
 *
 * Usage:
 *   npm run create-admin admin@example.com "Your Name" "s3cure-p4ss"
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { users } from '../src/db/schema';

const [, , email, name, password] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-admin <email> <name> <password>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

void (async () => {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id}). Nothing done.`);
    process.exit(0);
  }

  const [created] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name: name ?? email,
      passwordHash,
      role: 'admin',
      active: true,
    })
    .returning({ id: users.id });

  console.log(`✓ Admin created: ${email} (id: ${created?.id})`);
})();
