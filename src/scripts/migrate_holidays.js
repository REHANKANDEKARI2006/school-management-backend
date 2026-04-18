import { createHolidayTables } from '../migrations/20260412_holiday_tables.js';

async function run() {
  try {
    console.log('Running holiday migrations...');
    await createHolidayTables();
    console.log('Holiday migrations successful.');
    process.exit(0);
  } catch (error) {
    console.error('Holiday migration failed:', error);
    process.exit(1);
  }
}

run();
