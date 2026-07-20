import db from '../config/db.js';


async function fixSchema() {
  const client = await db.connect();
  try {
    // ═══════════════════════════════════════════════
    // 1. Add missing columns to profile-related tables
    // ═══════════════════════════════════════════════
    console.log('🔧 Adding missing columns to profile tables...');
    await client.query('ALTER TABLE master_admin ADD COLUMN IF NOT EXISTS profile_url TEXT');
    await client.query('ALTER TABLE master_admin ADD COLUMN IF NOT EXISTS bg_id INTEGER REFERENCES blood_group(bg_id)');
    await client.query('ALTER TABLE admin ADD COLUMN IF NOT EXISTS profile_url TEXT');
    await client.query('ALTER TABLE admin ADD COLUMN IF NOT EXISTS bg_id INTEGER REFERENCES blood_group(bg_id)');
    await client.query('ALTER TABLE guardian ADD COLUMN IF NOT EXISTS profile_url TEXT');
    await client.query('ALTER TABLE guardian ADD COLUMN IF NOT EXISTS bg_id INTEGER REFERENCES blood_group(bg_id)');
    await client.query('ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER');
    console.log('✅ Profile table columns added.');

    // ═══════════════════════════════════════════════
    // 2. Fix fee_category: add allow_installments
    // ═══════════════════════════════════════════════
    console.log('🔧 Fixing fee_category table...');
    await client.query('ALTER TABLE fee_category ADD COLUMN IF NOT EXISTS allow_installments BOOLEAN DEFAULT FALSE');
    console.log('✅ fee_category fixed.');

    // ═══════════════════════════════════════════════
    // 3. Fix fee_structure: rename columns to match backend code
    //    Backend expects: fee_struct_id, fee_cat_id, section_id, session_year
    //    Current has: fee_structure_id, fee_category_id
    // ═══════════════════════════════════════════════
    console.log('🔧 Fixing fee_structure table...');
    
    // Check if fee_struct_id already exists
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'fee_structure' AND column_name = 'fee_struct_id'
    `);
    
    if (colCheck.rows.length === 0) {
      // Rename fee_structure_id -> fee_struct_id
      try {
        await client.query('ALTER TABLE fee_structure RENAME COLUMN fee_structure_id TO fee_struct_id');
        console.log('  Renamed fee_structure_id → fee_struct_id');
      } catch(e) {
        console.log('  fee_struct_id rename skipped:', e.message);
      }
    }

    // Check if fee_cat_id already exists
    const catColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'fee_structure' AND column_name = 'fee_cat_id'
    `);
    
    if (catColCheck.rows.length === 0) {
      try {
        await client.query('ALTER TABLE fee_structure RENAME COLUMN fee_category_id TO fee_cat_id');
        console.log('  Renamed fee_category_id → fee_cat_id');
      } catch(e) {
        console.log('  fee_cat_id rename skipped:', e.message);
      }
    }

    // Add missing columns
    await client.query('ALTER TABLE fee_structure ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES section(section_id)');
    await client.query('ALTER TABLE fee_structure ADD COLUMN IF NOT EXISTS session_year VARCHAR(20)');
    console.log('✅ fee_structure fixed.');

    // ═══════════════════════════════════════════════
    // 4. Create fee_collection table (backend expects this, not fee_payment)
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating fee_collection table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_collection (
        collection_id  SERIAL PRIMARY KEY,
        student_id     INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        fee_struct_id  INTEGER NOT NULL REFERENCES fee_structure(fee_struct_id) ON DELETE CASCADE,
        amount_paid    DECIMAL(10,2) NOT NULL,
        payment_date   DATE DEFAULT CURRENT_DATE,
        installment_no INTEGER,
        receipt_no     VARCHAR(100),
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ fee_collection table created.');

    // ═══════════════════════════════════════════════
    // 5. Create fee_installment table
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating fee_installment table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_installment (
        installment_id SERIAL PRIMARY KEY,
        fee_struct_id  INTEGER NOT NULL REFERENCES fee_structure(fee_struct_id) ON DELETE CASCADE,
        installment_no INTEGER NOT NULL,
        amount         DECIMAL(10,2) NOT NULL,
        due_date       DATE,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ fee_installment table created.');

    // ═══════════════════════════════════════════════
    // 6. Create school_profile table (used by auth_controller)
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating school_profile table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
        id              INTEGER PRIMARY KEY,
        school_name     VARCHAR(200),
        email           VARCHAR(150),
        phone           VARCHAR(50),
        address         TEXT,
        academic_year   VARCHAR(20),
        logo_url        TEXT,
        principal_name  VARCHAR(100),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ school_profile table created.');

    // ═══════════════════════════════════════════════
    // 7. Create student_submissions table (used by dashboard)
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating student_submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_submissions (
        submission_id  SERIAL PRIMARY KEY,
        material_id    INTEGER REFERENCES materials(material_id) ON DELETE CASCADE,
        student_id     INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        file_path      VARCHAR(255),
        submitted_at   TIMESTAMPTZ DEFAULT now(),
        grade          VARCHAR(10),
        feedback       TEXT
      )
    `);
    console.log('✅ student_submissions table created.');

    // ═══════════════════════════════════════════════
    // 8. Add section_name to class table (used by getClassTeacherDesignation)
    // ═══════════════════════════════════════════════
    console.log('🔧 Adding section_name to class table...');
    await client.query('ALTER TABLE class ADD COLUMN IF NOT EXISTS section_name VARCHAR(10)');
    // Populate section_name from section table
    await client.query(`
      UPDATE class c SET section_name = s.section_name 
      FROM section s WHERE c.section_id = s.section_id AND c.section_name IS NULL
    `);
    console.log('✅ class.section_name added.');

    console.log('\n=============================================');
    console.log('🎉 ALL SCHEMA FIXES APPLIED SUCCESSFULLY! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Schema fix error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixSchema();
