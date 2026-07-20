import db from '../config/db.js';

async function fix() {
  try {
    console.log('🔧 Fixing activity_log columns...');
    
    // Add the columns the dashboard code expects
    await db.query('ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action_type VARCHAR(20)');
    await db.query('ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS description TEXT');
    
    // Sync data from old columns to new ones where applicable
    await db.query("UPDATE activity_log SET action_type = action WHERE action_type IS NULL AND action IS NOT NULL");
    await db.query("UPDATE activity_log SET description = details WHERE description IS NULL AND details IS NOT NULL");
    
    console.log('✅ activity_log columns fixed!');
    
    // Verify
    const cols = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='activity_log' ORDER BY ordinal_position"
    );
    console.log('Final columns:', cols.rows.map(c => c.column_name).join(', '));
    
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

fix();
