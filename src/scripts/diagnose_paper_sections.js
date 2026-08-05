import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function diagnose() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to database\n');

    // 1. Check if paper_sections table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'paper_sections'
      )
    `);
    console.log('📋 paper_sections table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ CRITICAL: paper_sections table does NOT exist! This is the root cause.');
      return;
    }

    // 2. Check columns on paper_sections
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'paper_sections'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 paper_sections columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) nullable=${col.is_nullable} default=${col.column_default || 'none'}`);
    });

    const columnNames = columns.rows.map(c => c.column_name);
    const hasSectionName = columnNames.includes('section_name');
    const hasTotalMarks = columnNames.includes('total_section_marks');
    const hasTitle = columnNames.includes('title');
    
    console.log(`\n🔍 Has 'section_name' column: ${hasSectionName}`);
    console.log(`🔍 Has 'total_section_marks' column: ${hasTotalMarks}`);
    console.log(`🔍 Has 'title' column: ${hasTitle}`);

    // 3. Check if paper_id=13 exists
    const paper = await client.query('SELECT paper_id, title, status, institute_id FROM question_papers WHERE paper_id = 13');
    if (paper.rows.length > 0) {
      console.log(`\n📄 Paper #13: title="${paper.rows[0].title}" status="${paper.rows[0].status}" institute_id=${paper.rows[0].institute_id}`);
    } else {
      console.log('\n❌ Paper #13 does NOT exist in database');
    }

    // 4. Check existing sections for paper 13
    try {
      const sections = await client.query('SELECT * FROM paper_sections WHERE paper_id = 13');
      console.log(`\n📋 Existing sections for paper #13: ${sections.rows.length} found`);
      sections.rows.forEach(s => console.log(`   section_id=${s.section_id} name=${s.section_name || s.title || 'N/A'} order=${s.section_order}`));
    } catch (e) {
      console.log(`\n❌ Error querying sections: ${e.message}`);
    }

    // 5. Try a test INSERT (what the upsertSection does)
    if (!hasSectionName || !hasTotalMarks) {
      console.log('\n\n🚨🚨🚨 ROOT CAUSE FOUND 🚨🚨🚨');
      if (!hasSectionName) console.log('   ❌ Missing column: section_name');
      if (!hasTotalMarks) console.log('   ❌ Missing column: total_section_marks');
      console.log('   The model code tries to INSERT/UPDATE using these columns but they don\'t exist.');
      console.log('\n🔧 FIXING NOW: Adding missing columns...');
      
      if (!hasSectionName) {
        await client.query('ALTER TABLE paper_sections ADD COLUMN IF NOT EXISTS section_name VARCHAR(255)');
        console.log('   ✅ Added section_name column');
      }
      if (!hasTotalMarks) {
        await client.query('ALTER TABLE paper_sections ADD COLUMN IF NOT EXISTS total_section_marks DOUBLE PRECISION DEFAULT 0');
        console.log('   ✅ Added total_section_marks column');
      }
      
      // Sync data if title exists
      if (hasTitle) {
        await client.query('UPDATE paper_sections SET section_name = title WHERE section_name IS NULL AND title IS NOT NULL');
        console.log('   ✅ Synced existing title data to section_name');
      }
      
      // Also fix questions table columns if needed
      const qCols = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'questions'
      `);
      const qColNames = qCols.rows.map(c => c.column_name);
      
      if (!qColNames.includes('question_data')) {
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_data JSONB DEFAULT '{}'");
        console.log('   ✅ Added questions.question_data column');
      }
      if (!qColNames.includes('difficulty')) {
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Medium'");
        console.log('   ✅ Added questions.difficulty column');
      }
      if (!qColNames.includes('answer_key')) {
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_key TEXT");
        console.log('   ✅ Added questions.answer_key column');
      }
      if (!qColNames.includes('explanation')) {
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT");
        console.log('   ✅ Added questions.explanation column');
      }
      if (!qColNames.includes('blooms_taxonomy')) {
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS blooms_taxonomy VARCHAR(100)");
        console.log('   ✅ Added questions.blooms_taxonomy column');
      }
      
      console.log('\n🎉 Schema fix complete! Paper generator should work now.');
    } else {
      // 6. Try actual insert to verify it works
      console.log('\n🧪 Testing actual INSERT (will rollback)...');
      await client.query('BEGIN');
      try {
        const testResult = await client.query(
          `INSERT INTO paper_sections (paper_id, section_name, section_order, total_section_marks) VALUES (13, 'TEST_SECTION', 999, 0) RETURNING *`
        );
        console.log('   ✅ INSERT succeeded:', testResult.rows[0]);
        await client.query('ROLLBACK');
        console.log('   ✅ Rolled back test insert. Schema is correct!');
        console.log('\n⚠️  Schema looks fine. The issue might be:');
        console.log('   1. Auth token issue (JWT expired/invalid)');
        console.log('   2. institute_id mismatch in paper ownership check');
        console.log('   3. Network/timeout issue between frontend and backend');
      } catch (insertErr) {
        await client.query('ROLLBACK');
        console.log(`   ❌ INSERT failed: ${insertErr.message}`);
        console.log('   This is the root cause of the autosave failure!');
      }
    }

  } catch (err) {
    console.error('❌ Diagnostic error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnose();
