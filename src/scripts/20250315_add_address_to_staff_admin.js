import db from '../config/db.js';

export async function addAddressToProfiles() {
  try {
    console.log('Adding address column to staff, admin, and master_admin tables...');

    // 1. Add to staff
    await db.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    console.log('Column `address` added to `staff`.');

    // 2. Add to admin
    await db.query(`
      ALTER TABLE admin 
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    console.log('Column `address` added to `admin`.');

    // 3. Add to master_admin
    await db.query(`
      ALTER TABLE master_admin 
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    console.log('Column `address` added to `master_admin`.');

  } catch (error) {
    console.error('addAddressToProfiles error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addAddressToProfiles().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
