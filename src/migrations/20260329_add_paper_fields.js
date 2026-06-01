import pool from '../config/db.js';

const up = async () => {
  try {
    await pool.query(`
      ALTER TABLE question_papers
      ADD COLUMN IF NOT EXISTS passing_marks INTEGER DEFAULT 32,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_marks BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_instructions BOOLEAN DEFAULT true;
    `);

    await pool.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS answer_key TEXT,
      ADD COLUMN IF NOT EXISTS explanation TEXT,
      ADD COLUMN IF NOT EXISTS blooms_taxonomy VARCHAR(100);
    `);

    console.log('Successfully added new fields for dynamic Question Paper Generator logic.');
  } catch (error) {
    console.error('Error adding new fields for question papers:', error);
  }
};

const down = async () => {
  try {
    await pool.query(`
      ALTER TABLE question_papers
      DROP COLUMN IF EXISTS passing_marks,
      DROP COLUMN IF EXISTS difficulty_level,
      DROP COLUMN IF EXISTS shuffle_questions,
      DROP COLUMN IF EXISTS shuffle_options,
      DROP COLUMN IF EXISTS show_marks,
      DROP COLUMN IF EXISTS show_instructions;
    `);

    await pool.query(`
      ALTER TABLE questions
      DROP COLUMN IF EXISTS difficulty,
      DROP COLUMN IF EXISTS answer_key,
      DROP COLUMN IF EXISTS explanation,
      DROP COLUMN IF EXISTS blooms_taxonomy;
    `);
    
    console.log('Successfully removed dynamic Question Paper Generator fields.');
  } catch (error) {
    console.error('Error removing fields:', error);
  }
};

export { up, down };
