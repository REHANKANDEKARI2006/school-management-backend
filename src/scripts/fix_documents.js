import db from '../config/db.js';

async function fixDocumentSchema() {
  const client = await db.connect();
  try {
    console.log('🔧 Ensuring all columns exist on school_profile...');
    const spCols = [
      ['institute_id', 'INTEGER'],
      ['school_name', 'VARCHAR(200)'],
      ['organization_name', 'VARCHAR(200)'],
      ['email', 'VARCHAR(150)'],
      ['phone', 'VARCHAR(50)'],
      ['address', 'TEXT'],
      ['academic_year', 'VARCHAR(20) DEFAULT \'2025-26\''],
      ['logo_url', 'TEXT'],
      ['principal_name', 'VARCHAR(100)'],
      ['affiliation_number', 'VARCHAR(100)'],
      ['signature_url', 'TEXT'],
      ['primary_color', 'VARCHAR(20)'],
      ['secondary_logo_url', 'TEXT'],
      ['stamp_url', 'TEXT'],
      ['header_layout_type', 'VARCHAR(30)'],
      ['footer_text', 'TEXT'],
      ['show_watermark', 'BOOLEAN DEFAULT FALSE'],
      ['document_config', 'JSONB'],
      ['id_card_config', 'JSONB'],
      ['school_type', 'VARCHAR(50)'],
      ['accreditation_line', 'TEXT'],
      ['website_url', 'VARCHAR(200)'],
      ['header_bg_color', 'VARCHAR(20)'],
      ['header_text_color', 'VARCHAR(20)'],
      ['separator_style', 'VARCHAR(20)'],
      ['separator_color', 'VARCHAR(20)'],
      ['separator_thickness', 'INTEGER'],
      ['footer_bg_color', 'VARCHAR(20)'],
      ['footer_text_color', 'VARCHAR(20)'],
      ['footer_left_text', 'TEXT'],
      ['footer_right_text', 'TEXT'],
      ['page_number_format', 'VARCHAR(20)'],
      ['show_generation_date', 'BOOLEAN DEFAULT TRUE'],
      ['cashier_signature_url', 'TEXT'],
      ['bonafide_config', 'JSONB'],
      ['achievement_config', 'JSONB'],
      ['selected_id_card_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['selected_bonafide_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['selected_mark_sheet_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['selected_general_certificate_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['selected_leaving_certificate_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['selected_fee_receipt_template', 'VARCHAR(50) DEFAULT \'template1\''],
      ['fee_receipt_config', 'JSONB'],
      ['document_theme', 'JSONB'],
      ['is_document_theme_enabled', 'BOOLEAN DEFAULT FALSE'],
    ];

    for (const [col, type] of spCols) {
      await client.query(`ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ school_profile columns added.');

    // Remove NOT NULL constraint on institute_id if it exists to avoid crashes
    await client.query('ALTER TABLE school_profile ALTER COLUMN institute_id DROP NOT NULL').catch(() => {});
    // Sync institute_id = id where institute_id is null
    await client.query('UPDATE school_profile SET institute_id = id WHERE institute_id IS NULL AND id IS NOT NULL');

    // 2. Create generated_documents table (for logging)
    console.log('🔧 Creating generated_documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id             SERIAL PRIMARY KEY,
        student_id     INTEGER REFERENCES student(student_id) ON DELETE CASCADE,
        doc_type       VARCHAR(50) NOT NULL,
        template_id    VARCHAR(100),
        generated_by   INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ generated_documents table created.');

    // 3. Create document_templates table
    console.log('🔧 Creating document_templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id                SERIAL PRIMARY KEY,
        template_name     VARCHAR(150) NOT NULL,
        document_type     VARCHAR(50) NOT NULL,
        base_template_id  VARCHAR(50) DEFAULT 'template1',
        title             TEXT,
        paragraph         TEXT,
        remarks           TEXT,
        language          VARCHAR(20) DEFAULT 'en',
        institute_id      INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_by        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        is_default        BOOLEAN DEFAULT FALSE,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ document_templates table created.');

    // 4. Ensure blood_group column exists and is populated
    console.log('🔧 Ensuring blood_group column is populated...');
    await client.query('ALTER TABLE blood_group ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10)');
    await client.query('UPDATE blood_group SET blood_group = bg_name WHERE blood_group IS NULL');
    console.log('✅ blood_group column synced.');

    // 5. Ensure default school_profile exists for institute 3 & all institutes
    console.log('🔧 Ensuring default school_profile exists...');
    const insts = await client.query('SELECT institute_id, name, email, phone, address, logo_url FROM institute');
    for (const inst of insts.rows) {
      const spCheck = await client.query('SELECT id FROM school_profile WHERE id = $1', [inst.institute_id]);
      if (spCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO school_profile (
            id, institute_id, school_name, organization_name, email, phone, address, principal_name, logo_url, academic_year,
            selected_id_card_template, selected_bonafide_template, selected_mark_sheet_template,
            selected_general_certificate_template, selected_leaving_certificate_template, selected_fee_receipt_template
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          inst.institute_id,
          inst.institute_id,
          inst.name || 'School Name',
          inst.name || 'Organization',
          inst.email || 'school@demo.edu.in',
          inst.phone || '+91 000 000 0000',
          inst.address || 'School Address',
          'Principal',
          inst.logo_url || '',
          '2025-26',
          'template1', 'template1', 'template1', 'template1', 'template1', 'template1'
        ]);
        console.log(`✅ Default school_profile inserted for institute ${inst.institute_id}.`);
      } else {
        await client.query('UPDATE school_profile SET institute_id = $1 WHERE id = $1 AND institute_id IS NULL', [inst.institute_id]);
      }
    }

    console.log('\n=============================================');
    console.log('🎉 DOCUMENT SCHEMA FIXES COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixDocumentSchema();
