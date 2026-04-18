import pool from '../config/db.js';

const holidays = [
  'Republic Day', 'Holi', 'Good Friday', 'Eid-ul-Fitr', 'Ambedkar Jayanti', 
  'Maharashtra Day', 'Buddha Purnima', 'Bakri Eid', 'Muharram', 
  'Independence Day', 'Ganesh Chaturthi', 'Eid-e-Milad', 'Gandhi Jayanti', 
  'Dussehra', 'Diwali', 'Guru Nanak Jayanti', 'Christmas'
];

async function cleanup() {
  try {
    console.log('Starting legacy holiday cleanup...');
    const pattern = holidays.map(h => `%${h}%`);
    
    // We target 2026 specifically to be safe
    const res = await pool.query(
      "DELETE FROM events WHERE event_name ILIKE ANY($1) AND event_date >= '2026-01-01' AND event_date <= '2026-12-31'",
      [pattern]
    );
    
    console.log(`✅ Deleted ${res.rowCount} legacy 2026 holidays.`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
