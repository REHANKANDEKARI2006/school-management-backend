// src/migrations/20260327_seed_paper_format_templates.js
// Seeds all class/subject/exam-type format templates (Classes 1-10, CBSE)

import db from '../config/db.js';

// ─────────────────────────────────────────────────
// HELPER: build a simple section object
// ─────────────────────────────────────────────────
const sec = (id, title, description, questions) => ({ id, title, description, questions });
const q = (id, type, title, count, marksPerQuestion, description = null) => ({
  id, type, title, count, marksPerQuestion,
  totalMarks: count * marksPerQuestion,
  ...(description ? { description } : {})
});

// ─────────────────────────────────────────────────
// CLASS GROUPS 1-2 (All Subjects — Simple Format)
// ─────────────────────────────────────────────────
const cls12All = [
  sec('A', 'Section A — Picture-Based', 'Look at the pictures and answer.', [
    q('a1', 'Picture-Based', 'Picture Questions', 5, 1)
  ]),
  sec('B', 'Section B — Circle the Correct Word', 'Circle the correct word from the choices given.', [
    q('b1', 'MCQ', 'Circle the Correct Answer', 5, 1)
  ]),
  sec('C', 'Section C — Fill in the Blanks', 'Fill in the blanks with the correct word.', [
    q('c1', 'FillInTheBlanks', 'Fill in the Blanks', 5, 1)
  ]),
  sec('D', 'Section D — Match the Following', 'Draw lines to match the correct pairs.', [
    q('d1', 'MatchFollowing', 'Match the Following', 5, 1)
  ]),
  sec('E', 'Section E — Write Sentences', 'Write one sentence about each picture or topic.', [
    q('e1', 'SA', 'Write Sentences', 5, 2)
  ])
];

// ─────────────────────────────────────────────────
// CLASS GROUP 3-5 TEMPLATES
// ─────────────────────────────────────────────────
const cls35English = [
  sec('A', 'Section A — Reading Comprehension', 'Read the passage carefully and answer the questions.', [
    q('a1', 'Comprehension', 'Comprehension Questions', 5, 2)
  ]),
  sec('B', 'Section B — Grammar', 'Do as directed.', [
    q('b1', 'FillInTheBlanks', 'Fill in the Blanks', 5, 1),
    q('b2', 'MCQ', 'Choose the Correct Option', 5, 1),
    q('b3', 'TrueFalse', 'True or False', 5, 1)
  ]),
  sec('C', 'Section C — Writing', 'Write in your own words.', [
    q('c1', 'Essay', 'Short Paragraph Writing', 1, 5),
    q('c2', 'LetterWriting', 'Letter Writing', 1, 5)
  ]),
  sec('D', 'Section D — Literature', 'Answer the following questions from your textbook.', [
    q('d1', 'VSA', 'Very Short Answer', 5, 1),
    q('d2', 'SA', 'Short Answer', 4, 2),
    q('d3', 'LA', 'Long Answer', 1, 5)
  ])
];

const cls35Maths = [
  sec('A', 'Section A — MCQ and Fill in the Blanks', 'Choose the correct answer or fill in the blank.', [
    q('a1', 'MCQ', 'Multiple Choice Questions', 5, 1),
    q('a2', 'FillInTheBlanks', 'Fill in the Blanks', 5, 1)
  ]),
  sec('B', 'Section B — Short Answer', 'Solve the following calculations.', [
    q('b1', 'SA', 'Short Calculations', 10, 2)
  ]),
  sec('C', 'Section C — Long Answer / Word Problems', 'Solve with full working.', [
    q('c1', 'LA', 'Word Problems', 4, 5)
  ])
];

const cls35EVS = [
  sec('A', 'Section A — MCQ and True/False', 'Circle the correct answer.', [
    q('a1', 'MCQ', 'Multiple Choice Questions', 5, 1),
    q('a2', 'TrueFalse', 'True or False', 5, 1)
  ]),
  sec('B', 'Section B — Short Answer', 'Answer in 2–3 sentences.', [
    q('b1', 'SA', 'Short Answer Questions', 5, 3)
  ]),
  sec('C', 'Section C — Long Answer and Draw & Label', 'Answer in detail.', [
    q('c1', 'LA', 'Long Answer Questions', 2, 5),
    q('c2', 'DiagramLabel', 'Draw and Label', 1, 5)
  ])
];

const cls35Hindi = [
  sec('A', 'Section A — Gadyansh / Padyansh (Comprehension)', 'Neeche diye gaye gadyansh ko padhkar prashno ke uttar dijiye.', [
    q('a1', 'Comprehension', 'Gadyansh Aadharit Prashna', 5, 2)
  ]),
  sec('B', 'Section B — Vyakaran (Grammar)', 'Neeche diye gaye prashno ke uttar dijiye.', [
    q('b1', 'FillInTheBlanks', 'Khali Jagah Bhariye', 5, 1),
    q('b2', 'MCQ', 'Sahi Vikalp Chuniye', 5, 1),
    q('b3', 'MatchFollowing', 'Mel Milaye', 5, 1)
  ]),
  sec('C', 'Section C — Lekhan (Writing)', 'Apne shabdo mein likhiye.', [
    q('c1', 'Essay', 'Anuchchhed Lekhan', 1, 5),
    q('c2', 'LetterWriting', 'Patra Lekhan', 1, 5)
  ]),
  sec('D', 'Section D — Paath Aadharit Prashna', 'Apni paathyapustak ke aadhar par uttar dijiye.', [
    q('d1', 'VSA', 'Ati Laghu Uttariya', 5, 1),
    q('d2', 'SA', 'Laghu Uttariya', 4, 2),
    q('d3', 'LA', 'Deergha Uttariya', 1, 5)
  ])
];

// ─────────────────────────────────────────────────
// CLASS GROUP 6-8 TEMPLATES
// ─────────────────────────────────────────────────
const cls68English = [
  sec('A', 'Section A — Reading', 'Read the passage carefully and answer all questions.', [
    q('a1', 'Comprehension', 'Unseen Passage — Comprehension and Vocabulary', 10, 2)
  ]),
  sec('B', 'Section B — Writing and Grammar', 'Do as directed.', [
    q('b1', 'LetterWriting', 'Letter / Notice / Essay Writing', 1, 10),
    q('b2', 'FillInTheBlanks', 'Grammar Exercises', 10, 2)
  ]),
  sec('C', 'Section C — Literature', 'Answer from Prose and Poetry.', [
    q('c1', 'VSA', 'Extract-Based Questions', 4, 2),
    q('c2', 'SA', 'Short Answer Questions', 4, 3),
    q('c3', 'LA', 'Long Answer Questions', 2, 5)
  ])
];

const cls68Maths = [
  sec('A', 'Section A — MCQ', 'Choose the correct answer. (1 mark each)', [
    q('a1', 'MCQ', 'Multiple Choice Questions', 20, 1)
  ]),
  sec('B', 'Section B — VSA', 'Very Short Answer Questions. (2 marks each)', [
    q('b1', 'VSA', 'Very Short Answer', 8, 2)
  ]),
  sec('C', 'Section C — SA', 'Short Answer Questions. (3 marks each)', [
    q('c1', 'SA', 'Short Answer', 6, 3)
  ]),
  sec('D', 'Section D — LA', 'Long Answer Questions. (5 marks each)', [
    q('d1', 'LA', 'Long Answer', 4, 5)
  ]),
  sec('E', 'Section E — Case-Based', 'Read the case and answer.', [
    q('e1', 'CaseBased', 'Case-Based Questions', 1, 6)
  ])
];

const cls68Science = [
  sec('A', 'Section A — MCQ and Assertion-Reason', 'Choose the correct option.', [
    q('a1', 'MCQ', 'Multiple Choice Questions', 15, 1),
    q('a2', 'AssertionReason', 'Assertion-Reason Questions', 5, 1)
  ]),
  sec('B', 'Section B — VSA', 'Answer in 1–2 sentences. (2 marks each)', [
    q('b1', 'VSA', 'Very Short Answer', 8, 2)
  ]),
  sec('C', 'Section C — SA', 'Answer in 3–4 sentences. (3 marks each)', [
    q('c1', 'SA', 'Short Answer', 6, 3)
  ]),
  sec('D', 'Section D — LA', 'Answer in detail. (5 marks each)', [
    q('d1', 'LA', 'Long Answer', 4, 5)
  ]),
  sec('E', 'Section E — Case-Based and Diagram', 'Read and answer. Draw and label.', [
    q('e1', 'CaseBased', 'Case-Based Questions', 1, 4),
    q('e2', 'DiagramLabel', 'Draw and Label the Diagram', 1, 2)
  ])
];

const cls68SocialScience = [
  sec('A', 'Section A — History', 'Answer all questions from History.', [
    q('a1', 'MCQ', 'MCQ', 5, 1),
    q('a2', 'SA', 'Short Answer', 3, 3),
    q('a3', 'LA', 'Long Answer', 1, 6)
  ]),
  sec('B', 'Section B — Geography', 'Answer all questions from Geography. Attach a map if required.', [
    q('b1', 'MCQ', 'MCQ', 5, 1),
    q('b2', 'SA', 'Short Answer', 3, 3),
    q('b3', 'MapBased', 'Map-Based Question', 1, 5)
  ]),
  sec('C', 'Section C — Political Science', 'Answer all questions from Civics.', [
    q('c1', 'MCQ', 'MCQ', 5, 1),
    q('c2', 'SA', 'Short Answer', 3, 3),
    q('c3', 'LA', 'Long Answer', 1, 6)
  ]),
  sec('D', 'Section D — Economics', 'Answer all questions from Economics.', [
    q('d1', 'MCQ', 'MCQ', 5, 1),
    q('d2', 'SA', 'Short Answer', 3, 3),
    q('d3', 'LA', 'Long Answer', 1, 6)
  ])
];

const cls68Hindi = [
  sec('A', 'Section A — Apathit Gadyansh / Padyansh', 'Neeche diye gaye gadyansh/padyansh ko padhkar prashno ke uttar dijiye.', [
    q('a1', 'Comprehension', 'Apathit Gadyansh Aadharit Prashna', 5, 2),
    q('a2', 'Comprehension', 'Apathit Padyansh Aadharit Prashna', 5, 1)
  ]),
  sec('B', 'Section B — Vyavaharik Lekhan', 'Neeche diye gaye vishayo mein se kisi ek par likhiye.', [
    q('b1', 'LetterWriting', 'Patra / Suchna / Nibandh Lekhan', 1, 10),
    q('b2', 'Essay', 'Anuchchhed Lekhan', 1, 10)
  ]),
  sec('C', 'Section C — Vyakaran', 'Vyakaran ke prashno ke uttar dijiye.', [
    q('c1', 'MCQ', 'Sahi Vikalp Chuniye', 5, 1),
    q('c2', 'FillInTheBlanks', 'Khali Jagah Bhariye', 5, 1),
    q('c3', 'SA', 'Vyakaran Prashna', 5, 1)
  ]),
  sec('D', 'Section D — Paath Aadharit (Kshitij / Kritika)', 'Neeche diye gaye prashno ke uttar dijiye.', [
    q('d1', 'VSA', 'Ati Laghu Uttariya', 5, 2),
    q('d2', 'SA', 'Laghu Uttariya', 4, 3),
    q('d3', 'LA', 'Deergha Uttariya', 2, 6)
  ])
];

// ─────────────────────────────────────────────────
// CLASS GROUP 9-10 (CBSE Board Pattern)
// ─────────────────────────────────────────────────
const cls910English = [
  sec('A', 'Section A — Reading', 'Read the passages carefully and answer all questions.', [
    q('a1', 'Comprehension', 'Unseen Passage 1 — MCQ and Short Answer', 1, 10),
    q('a2', 'Comprehension', 'Unseen Passage 2 — MCQ and Short Answer', 1, 10)
  ]),
  sec('B', 'Section B — Writing and Grammar', 'Do as directed.', [
    q('b1', 'LetterWriting', 'Formal Letter / Advertisement / Notice', 1, 5),
    q('b2', 'Essay', 'Descriptive Paragraph', 1, 5),
    q('b3', 'MCQ', 'Grammar MCQ', 5, 1),
    q('b4', 'FillInTheBlanks', 'Grammar Fill in the Blanks', 5, 1)
  ]),
  sec('C', 'Section C — Literature', 'Answer questions from First Flight and Footprints.', [
    q('c1', 'Comprehension', 'Passage Extract (Prose / Poetry) — MCQ', 2, 5),
    q('c2', 'SA', 'Short Answer Questions', 8, 2),
    q('c3', 'LA', 'Long Answer Questions', 2, 5)
  ])
];

const cls910MathsStandard = [
  sec('A', 'Section A — MCQ', 'All questions are compulsory. (1 mark each)', [
    q('a1', 'MCQ', 'Multiple Choice Questions', 20, 1)
  ]),
  sec('B', 'Section B — VSA', 'Answer each in 1–2 steps. (2 marks each)', [
    q('b1', 'VSA', 'Very Short Answer', 5, 2)
  ]),
  sec('C', 'Section C — SA', 'Show complete working. (3 marks each)', [
    q('c1', 'SA', 'Short Answer', 6, 3)
  ]),
  sec('D', 'Section D — LA', 'Detailed solutions required. (5 marks each)', [
    q('d1', 'LA', 'Long Answer', 4, 5)
  ]),
  sec('E', 'Section E — Case-Based', 'Read the case study and answer sub-parts. (4 marks each)', [
    q('e1', 'CaseBased', 'Case-Based Questions', 3, 4)
  ])
];

const cls910Science = [
  sec('A', 'Section A — Biology', 'Answer all Biology questions.', [
    q('a1', 'MCQ', 'MCQ', 5, 1),
    q('a2', 'AssertionReason', 'Assertion-Reason', 5, 1),
    q('a3', 'SA', 'Short Answer', 4, 3),
    q('a4', 'LA', 'Long Answer', 1, 5)
  ]),
  sec('B', 'Section B — Chemistry', 'Answer all Chemistry questions.', [
    q('b1', 'MCQ', 'MCQ', 5, 1),
    q('b2', 'SA', 'Short Answer', 4, 3),
    q('b3', 'LA', 'Long Answer', 1, 5)
  ]),
  sec('C', 'Section C — Physics', 'Answer all Physics questions.', [
    q('c1', 'MCQ', 'MCQ', 5, 1),
    q('c2', 'SA', 'Short Answer', 4, 3),
    q('c3', 'DiagramLabel', 'Draw and Label', 1, 2),
    q('c4', 'LA', 'Long Answer', 1, 4)
  ])
];

const cls910SocialScience = [
  sec('A', 'Section A — History', 'Answer all questions from History.', [
    q('a1', 'MCQ', 'MCQ', 5, 1),
    q('a2', 'SA', 'Short Answer', 3, 3),
    q('a3', 'LA', 'Long Answer', 1, 6)
  ]),
  sec('B', 'Section B — Geography', 'Answer all Geography questions. Attach map.', [
    q('b1', 'MCQ', 'MCQ', 5, 1),
    q('b2', 'SA', 'Short Answer', 3, 3),
    q('b3', 'MapBased', 'Map-Based Question', 1, 6)
  ]),
  sec('C', 'Section C — Political Science', 'Answer all Civics questions.', [
    q('c1', 'MCQ', 'MCQ', 5, 1),
    q('c2', 'SA', 'Short Answer', 3, 3),
    q('c3', 'LA', 'Long Answer', 1, 6)
  ]),
  sec('D', 'Section D — Economics', 'Answer all Economics questions.', [
    q('d1', 'MCQ', 'MCQ', 5, 1),
    q('d2', 'SA', 'Short Answer', 3, 3),
    q('d3', 'LA', 'Long Answer', 1, 6)
  ])
];

const cls910Hindi = [
  sec('A', 'Section A — Apathit Gadyansh / Padyansh', 'Neeche diye gaye gadyansh/padyansh ko padhkar prashno ke uttar dijiye.', [
    q('a1', 'Comprehension', 'Apathit Gadyansh', 1, 10),
    q('a2', 'Comprehension', 'Apathit Padyansh', 1, 10)
  ]),
  sec('B', 'Section B — Lekhan (Patra / Anuchchhed / Suchna)', 'Neeche diye gaye vishayo mein se kisi ek par likhiye.', [
    q('b1', 'LetterWriting', 'Patra Lekhan', 1, 10),
    q('b2', 'Essay', 'Anuchchhed / Suchna Lekhan', 1, 10)
  ]),
  sec('C', 'Section C — Vyakaran', 'Vyakaran ke prashno ke uttar dijiye.', [
    q('c1', 'MCQ', 'Sahi Vikalp Chuniye', 5, 1),
    q('c2', 'FillInTheBlanks', 'Khali Jagah Bhariye', 5, 1),
    q('c3', 'SA', 'Vyakaran Prashna', 2, 3)
  ]),
  sec('D', 'Section D — Paath Aadharit (Kshitij / Kritika)', 'Neeche diye gaye prashno ke uttar dijiye.', [
    q('d1', 'VSA', 'Ati Laghu Uttariya', 4, 2),
    q('d2', 'SA', 'Laghu Uttariya', 4, 3),
    q('d3', 'LA', 'Deergha Uttariya', 2, 6)
  ])
];

// ─────────────────────────────────────────────────
// ALL TEMPLATES TO SEED
// ─────────────────────────────────────────────────
const templates = [
  // Class 1-2 (all subjects same simple format)
  { class_group: '1-2', subject: 'English',        exam_type: null, total_marks: 30, duration_mins: 60,  sections: cls12All },
  { class_group: '1-2', subject: 'Mathematics',    exam_type: null, total_marks: 30, duration_mins: 60,  sections: cls12All },
  { class_group: '1-2', subject: 'EVS',            exam_type: null, total_marks: 30, duration_mins: 60,  sections: cls12All },
  { class_group: '1-2', subject: 'Hindi',          exam_type: null, total_marks: 30, duration_mins: 60,  sections: cls12All },
  // Class 3-5
  { class_group: '3-5', subject: 'English',        exam_type: null, total_marks: 50, duration_mins: 120, sections: cls35English },
  { class_group: '3-5', subject: 'Mathematics',    exam_type: null, total_marks: 50, duration_mins: 120, sections: cls35Maths },
  { class_group: '3-5', subject: 'EVS',            exam_type: null, total_marks: 40, duration_mins: 90,  sections: cls35EVS },
  { class_group: '3-5', subject: 'Hindi',          exam_type: null, total_marks: 50, duration_mins: 120, sections: cls35Hindi },
  // Class 6-8
  { class_group: '6-8', subject: 'English',        exam_type: null, total_marks: 80, duration_mins: 180, sections: cls68English },
  { class_group: '6-8', subject: 'Mathematics',    exam_type: null, total_marks: 80, duration_mins: 180, sections: cls68Maths },
  { class_group: '6-8', subject: 'Science',        exam_type: null, total_marks: 80, duration_mins: 180, sections: cls68Science },
  { class_group: '6-8', subject: 'Social Science', exam_type: null, total_marks: 80, duration_mins: 180, sections: cls68SocialScience },
  { class_group: '6-8', subject: 'Hindi',          exam_type: null, total_marks: 80, duration_mins: 180, sections: cls68Hindi },
  // Class 9-10 (CBSE)
  { class_group: '9-10', subject: 'English',        exam_type: null, total_marks: 80, duration_mins: 180, sections: cls910English },
  { class_group: '9-10', subject: 'Mathematics',    exam_type: null, total_marks: 80, duration_mins: 180, sections: cls910MathsStandard },
  { class_group: '9-10', subject: 'Science',        exam_type: null, total_marks: 80, duration_mins: 180, sections: cls910Science },
  { class_group: '9-10', subject: 'Social Science', exam_type: null, total_marks: 80, duration_mins: 180, sections: cls910SocialScience },
  { class_group: '9-10', subject: 'Hindi',          exam_type: null, total_marks: 80, duration_mins: 180, sections: cls910Hindi },
];

export async function seedPaperFormatTemplates() {
  try {
    for (const t of templates) {
      await db.query(`
        INSERT INTO paper_format_templates (class_group, subject, exam_type, total_marks, duration_mins, sections)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (class_group, subject, exam_type) DO UPDATE SET
          total_marks   = EXCLUDED.total_marks,
          duration_mins = EXCLUDED.duration_mins,
          sections      = EXCLUDED.sections,
          updated_at    = now()
      `, [t.class_group, t.subject, t.exam_type, t.total_marks, t.duration_mins, JSON.stringify(t.sections)]);
    }
    console.log(`✅ Seeded ${templates.length} paper format templates.`);
  } catch (error) {
    console.error('seedPaperFormatTemplates error:', error);
    throw error;
  }
}

seedPaperFormatTemplates();
