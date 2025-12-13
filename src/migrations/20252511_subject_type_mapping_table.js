import db from '../config/db.js';

// 1. Create the subject_type_mapping table
export async function createSubjectTypeMappingTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subject_type_mapping (
        sub_type_map_id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL,
        subject_type_id INTEGER NOT NULL,
        CONSTRAINT subject_type_mapping_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT subject_type_mapping_subject_type_id_fkey FOREIGN KEY (subject_type_id) REFERENCES public.subject_type_table(subject_type_id)
      )
    `);
    console.log('Table `subject_type_mapping` ensured.');
  } catch (error) {
    console.log('createSubjectTypeMappingTable error:', error);
  }
}

// 2. Drop the subject_type_mapping table
export async function dropSubjectTypeMappingTable() {
  try {
    await db.query('DROP TABLE IF EXISTS subject_type_mapping');
    console.log('Table `subject_type_mapping` dropped.');
  } catch (error) {
    console.log('dropSubjectTypeMappingTable error:', error);
  }
}

//Seeding Function
export async function seedSubjectTypeMappings() {
  try {
    await db.query(`
      -- Language (English: subject_id 1, Hindi: subject_id 2)
      INSERT INTO subject_type_mapping (subject_id, subject_type_id) VALUES
        (1, 1), -- English Theory
        (1, 3), -- English Practical
        (3, 1), -- Hindi Theory
        (3, 3), -- Hindi Practical

      -- Mathematics (Mathematics 1: subject_id 3, Mathematics 2: subject_id 4)
        (3, 1), -- Math 1 Theory
        (3, 3), -- Math 1 Practical
        (4, 1), -- Math 2 Theory
        (4, 3), -- Math 2 Practical

      -- Science (Science 1: subject_id 5, Science 2: subject_id 6)
        (5, 1), -- Science 1 Theory
        (5, 3), -- Science 1 Lab
        (5, 4), -- Science 1 Outdoor
        (6, 1), -- Science 2 Theory
        (6, 3), -- Science 2 Lab
        (6, 4), -- Science 2 Outdoor

      -- Sports (Sports: subject_id 7)
        (7, 4), -- Sports Outdoor

      -- Computer Science (subject_id 8): Theory, Practical, Lab (example)
        (8, 1), -- Computer Science Theory
        (8, 3), -- Computer Science Practical
        (8, 3), -- Computer Science Lab

      -- Art & Craft (subject_id 9): Practical
        (9, 3), -- Art & Craft Practical

      -- Music (subject_id 10): Practical, Theory
        (10, 1), -- Music Theory
        (10, 3); -- Music Practical
    `);
    console.log('Logical subject-type mappings inserted!');
  } catch (error) {
    console.log('seedSubjectTypeMappings error:', error);
  }
}


// 4. Remove all mappings
export async function removeAllSubjectTypeMappings() {
  try {
    await db.query('DELETE FROM subject_type_mapping');
    console.log('All subject-type mappings deleted.');
  } catch (error) {
    console.log('removeAllSubjectTypeMappings error:', error);
  }
}

// Uncomment only one at a time
// createSubjectTypeMappingTable();
seedSubjectTypeMappings();
// removeAllSubjectTypeMappings();
// dropSubjectTypeMappingTable();
