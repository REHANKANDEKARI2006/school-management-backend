// src/migrations/20260327_seed_class1_english.js
import db from '../config/db.js';

const class1English = {
  class_name: '1',
  subject: 'English',
  exam_type: null, // Set to NULL to be the base template for Class 1 English
  total_marks: 30,
  duration_mins: 120,
  instructions: [
    "All questions are compulsory.",
    "Each question carries 2 marks.",
    "Teacher will speak the question and its options loudly and slowly but no hint or clue will be given in any manner."
  ],
  labels: {
    duration: "Time",
    max_marks: "M.M",
    instructions_title: "Note",
    best_of_luck: "*** BEST OF LUCK ***"
  },
  sections: [
    {
      id: '1',
      title: 'Questions',
      description: 'Answer all the following questions.',
      questionGroups: [
        { type: 'MCQ', title: 'General MCQs', count: 7, marksPerQuestion: 2 },
        { type: 'TrueFalse', title: 'Tick (✓) / Cross (X)', count: 1, marksPerQuestion: 2 },
        { type: 'FillInTheBlanks', title: 'Complete Missing Letters', count: 1, marksPerQuestion: 2 },
        { type: 'MatchFollowing', title: 'Match the Following', count: 1, marksPerQuestion: 2 },
        { type: 'SA', title: 'Very Short Answer', count: 1, marksPerQuestion: 2 },
        { type: 'MCQ', title: 'Picture/Identifying MCQs', count: 4, marksPerQuestion: 2 }
      ]
    }
  ]
};

export async function seedClass1English() {
  try {
    console.log('Cleaning up old Class 1 English templates...');
    await db.query(`
      DELETE FROM paper_format_templates 
      WHERE (class_name = '1' OR class_group = '1-2') 
        AND subject = 'English' 
        AND (exam_type IS NULL OR exam_type = 'annual')
    `);

    console.log('Inserting Class 1 English base template...');
    await db.query(`
      INSERT INTO paper_format_templates 
      (class_name, class_group, subject, exam_type, total_marks, duration_mins, instructions, labels, sections)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      class1English.class_name, 
      '1-2', 
      class1English.subject, 
      class1English.exam_type, 
      class1English.total_marks, 
      class1English.duration_mins, 
      JSON.stringify(class1English.instructions),
      JSON.stringify(class1English.labels),
      JSON.stringify(class1English.sections)
    ]);
    console.log('✅ Seeded Class 1 English template as BASE.');
  } catch (error) {
    console.error('seedClass1English error:', error);
    throw error;
  }
}

seedClass1English();
