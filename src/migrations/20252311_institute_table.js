import db from '../config/db.js';

// 1. Create institute table if not exists (unchanged)
export async function createInstituteTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS institute (
        institute_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        short_name VARCHAR(50),
        address VARCHAR(255),
        city VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50),
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(100),
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP,
        status_id INTEGER,
        CONSTRAINT institute_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.status(status_id)
      )
    `);
    console.log('Table `institute` ensured.');
  } catch (error) {
    console.log('CreateInstituteTable error:', error);
  }
}

// 2. Drop/delete institute table (unchanged)
export async function dropInstituteTable() {
  try {
    await db.query('DROP TABLE IF EXISTS institute');
    console.log('Table `institute` dropped.');
  } catch (error) {
    console.log('DropInstituteTable error:', error);
  }
}

// 3. Insert demo data (NO manual/interactive input)
export async function seedInstitutes() {
  try {
    await db.query(`
      INSERT INTO institute
        (name, short_name, address, city, state, country, postal_code, phone, email, website, logo_url, updated_at, status_id)
      VALUES
        ('Happy Valley College', 'HVC', '123 Main Road, Sector 7', 'Mumbai', 'Maharashtra', 'India', '400001', '022-12345678', 'info@happyvalley.edu.in', 'https://happyvalley.edu.in', 'https://happyvalley.edu.in/logo.png', NOW(), 1),
        ('Sunshine Public School', 'SPS', '88 Sunshine St.', 'Pune', 'Maharashtra', 'India', '411001', '020-33445566', 'contact@sunshineps.edu.in', 'https://sunshineps.edu.in', 'https://sunshineps.edu.in/logo.png', NOW(), 1),
        ('Blue Ridge Academy', 'BRA', 'Plot 5, Blue Ridge Lane', 'Bangalore', 'Karnataka', 'India', '560001', '080-66554477', 'admin@blueridge.edu.in', 'https://blueridge.edu.in', 'https://blueridge.edu.in/logo.png', NOW(), 1)
    `);
    console.log('Demo institute data inserted!');
  } catch (error) {
    console.log('seedInstitutes error:', error);
  }
}

// 4. Remove all institutes (unchanged)
export async function removeAllInstitutes() {
  try {
    await db.query('DELETE FROM institute');
    console.log('All institute records deleted.');
  } catch (error) {
    console.log('RemoveAllInstitutes error:', error);
  }
}

// Uncomment one at a time as needed for your process:
// createInstituteTable();
seedInstitutes();
// removeAllInstitutes();
// dropInstituteTable();
