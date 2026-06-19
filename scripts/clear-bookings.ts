import postgres from 'postgres';

async function clearBookings() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set in .env file');
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('Clearing booking data...');

    // Delete in order of dependencies
    await sql`DELETE FROM stock_ledger`;
    console.log('✓ Cleared stock ledger');

    await sql`DELETE FROM booking_items`;
    console.log('✓ Cleared booking items');

    await sql`DELETE FROM booking_addons`;
    console.log('✓ Cleared booking add-ons');

    await sql`DELETE FROM bookings`;
    console.log('✓ Cleared bookings');

    console.log('\nDone! All booking data cleared.');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearBookings();
