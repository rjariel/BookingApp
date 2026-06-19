import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
console.log('columns:', cols.map((c: any) => c.column_name).join(', '));
const usrs = await sql`SELECT id, email, role, active, username FROM users LIMIT 10`;
console.log('users:', JSON.stringify(usrs, null, 2));
await sql.end();
