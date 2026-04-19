// src/migrations/20260419_event_photos_table.js
import db from '../config/db.js';

/**
 * 1. CREATE event_photos table
 */
export async function createEventPhotosTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_photos (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ event_photos table created.');
  } catch (error) {
    console.error('createEventPhotosTable error:', error);
  }
}

/**
 * 2. DROP event_photos table
 */
export async function dropEventPhotosTable() {
  try {
    await db.query('DROP TABLE IF EXISTS event_photos CASCADE');
    console.log('✅ event_photos table dropped.');
  } catch (error) {
    console.error('dropEventPhotosTable error:', error);
  }
}

/**
 * Run migrations
 */
export async function run() {
  await createEventPhotosTable();
  process.exit(0);
}

// Only run if called directly
if (process.argv[1].endsWith('20260419_event_photos_table.js')) {
  run();
}
