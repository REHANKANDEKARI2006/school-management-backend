import db from '../config/db.js';

export async function addBrandingToSchoolProfile() {
  try {
    console.log('Adding branding columns to school_profile table...');
    await db.query(`
      ALTER TABLE school_profile
      ADD COLUMN IF NOT EXISTS secondary_logo_url TEXT,
      ADD COLUMN IF NOT EXISTS stamp_url TEXT,
      ADD COLUMN IF NOT EXISTS header_layout_type VARCHAR(20) DEFAULT 'LEFT',
      ADD COLUMN IF NOT EXISTS footer_text TEXT,
      ADD COLUMN IF NOT EXISTS show_watermark BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS document_config JSONB DEFAULT '{}';
    `);
    console.log('Branding columns added to school_profile table successfully.');
  } catch (error) {
    console.error('Error adding branding columns:', error);
  } finally {
      // Don't close pool if it is shared, but here it's a script
      // process.exit(0);
  }
}

addBrandingToSchoolProfile().then(() => process.exit(0)).catch(() => process.exit(1));
