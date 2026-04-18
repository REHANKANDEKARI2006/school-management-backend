import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log("🚀 Starting Document Branding Migration...");
    
    const queries = [
      // Identity
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS school_type VARCHAR(255)",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS accreditation_line VARCHAR(255)",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)",
      
      // Header Style
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS header_bg_color VARCHAR(50) DEFAULT '#ffffff'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS header_text_color VARCHAR(50) DEFAULT '#000000'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_style VARCHAR(50) DEFAULT 'solid'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_color VARCHAR(50) DEFAULT '#e2e8f0'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_thickness INTEGER DEFAULT 1",
      
      // Footer Style
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_bg_color VARCHAR(50) DEFAULT '#ffffff'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(50) DEFAULT '#64748b'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_left_text VARCHAR(255)",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_right_text VARCHAR(255)",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS page_number_format VARCHAR(50) DEFAULT 'Page 1 of n'",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS show_generation_date BOOLEAN DEFAULT true",
      
      // Signatures & Stamps
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS cashier_signature_url VARCHAR(512)",
      
      // Unique Certificates Config
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS bonafide_config JSONB",
      "ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS achievement_config JSONB"
    ];

    for (const q of queries) {
      console.log(`Executing: ${q}`);
      await pool.query(q);
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
