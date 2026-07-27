import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const unitTestQuestions = [
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "mcq",
    question_text: "What is the capital of India?",
    options: ["Mumbai", "Delhi", "Kolkata", "Chennai"],
    answer: "Delhi",
    difficulty: "easy",
    marks: 10,
    tags: ["mcq", "geography", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "mcq",
    question_text: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    answer: "Mars",
    difficulty: "easy",
    marks: 10,
    tags: ["mcq", "science", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "fill_blank",
    question_text: "The Sun rises in the __________.",
    options: null,
    answer: "East",
    difficulty: "easy",
    marks: 10,
    tags: ["fill-blank", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "fill_blank",
    question_text: "India is located in the continent of __________.",
    options: null,
    answer: "Asia",
    difficulty: "easy",
    marks: 10,
    tags: ["fill-blank", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "true_false",
    question_text: "The Earth revolves around the Sun.",
    options: ["True", "False"],
    answer: "True",
    difficulty: "easy",
    marks: 10,
    tags: ["true-false", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "true_false",
    question_text: "Fish can live without water.",
    options: ["True", "False"],
    answer: "False",
    difficulty: "easy",
    marks: 10,
    tags: ["true-false", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "General Knowledge",
    question_type: "short_answer",
    question_text: "Who is known as the Father of the Nation?",
    options: null,
    answer: "Mahatma Gandhi",
    difficulty: "easy",
    marks: 10,
    tags: ["one-line", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Science",
    question_type: "short_answer",
    question_text: "Which gas do humans need for breathing?",
    options: null,
    answer: "Oxygen",
    difficulty: "easy",
    marks: 10,
    tags: ["one-line", "science", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Match The Following",
    question_type: "match_following",
    question_text: "Match the following Columns:\nColumn A: 1. Sun, 2. Earth, 3. Rose, 4. Mango\nColumn B: (a) Flower, (b) Fruit, (c) Planet, (d) Star",
    options: {
      columnA: ["1. Sun", "2. Earth", "3. Rose", "4. Mango"],
      columnB: ["(a) Flower", "(b) Fruit", "(c) Planet", "(d) Star"]
    },
    answer: "1 - (d), 2 - (c), 3 - (a), 4 - (b)",
    difficulty: "easy",
    marks: 10,
    tags: ["match-following", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Environment",
    question_type: "short_answer",
    question_text: "Write two uses of water.",
    options: null,
    answer: "Water is used for drinking and cooking.",
    difficulty: "medium",
    marks: 10,
    tags: ["short-answer", "environment", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Environment",
    question_type: "short_answer",
    question_text: "Why are trees important?",
    options: null,
    answer: "Trees provide oxygen, fruits, shade, and help reduce pollution.",
    difficulty: "medium",
    marks: 10,
    tags: ["short-answer", "environment", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Environment",
    question_type: "long_answer",
    question_text: "Explain the importance of saving water.",
    options: null,
    answer: "Water is essential for all living beings. Without water, plants, animals, and humans cannot survive. We should avoid wasting water and use it carefully. Rainwater harvesting and proper water management help conserve water for future generations.",
    difficulty: "medium",
    marks: 10,
    tags: ["long-answer", "environment", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Comprehension",
    question_type: "comprehension",
    question_text: "Read the following passage and do the activities:\nPassage: Ravi was walking to school when he saw an injured bird near the roadside. He carefully picked it up and gave it water. Later, he took the bird to an animal care center.",
    options: {
      subQuestions: [
        { text: "Where was Ravi going?", marks: 4, answer: "Ravi was walking to school." },
        { text: "What did Ravi see?", marks: 3, answer: "He saw an injured bird." },
        { text: "What did Ravi do for the bird?", marks: 3, answer: "He gave it water." }
      ]
    },
    answer: "(i) Ravi was walking to school. (ii) He saw an injured bird. (iii) He gave it water.",
    difficulty: "medium",
    marks: 10,
    tags: ["comprehension", "reading", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Diagram",
    question_type: "short_answer",
    question_text: "Label the parts of a plant.",
    options: { labels: ["1. Root", "2. Stem", "3. Flower", "4. Leaf"] },
    answer: "1. Root, 2. Stem, 3. Flower, 4. Leaf",
    difficulty: "easy",
    marks: 10,
    tags: ["diagram", "botany", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Mathematics",
    question_type: "short_answer",
    question_text: "245 + 378 = ?",
    options: null,
    answer: "623",
    difficulty: "easy",
    marks: 10,
    tags: ["calculation", "math", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Mathematics",
    question_type: "short_answer",
    question_text: "A shopkeeper has 120 chocolates. He sold 45 chocolates. How many chocolates are left?",
    options: null,
    answer: "120 - 45 = 75 Chocolates",
    difficulty: "medium",
    marks: 10,
    tags: ["word-problem", "math", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Environment",
    question_type: "short_answer",
    question_text: "Why are plants important for humans?",
    options: null,
    answer: "Plants provide oxygen, food, medicine, and help maintain environmental balance.",
    difficulty: "medium",
    marks: 10,
    tags: ["reasoning", "environment", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Writing",
    question_type: "long_answer",
    question_text: "Write a letter to your friend inviting him/her to your birthday party.",
    options: { pointsToCover: ["Rohan", "Arjun"] },
    answer: "25 June 2026\nDear Rohan,\nI am happy to invite you to my birthday party on 30 June 2026 at my home. The party will start at 6:00 PM. Please come with your family and make the occasion special.\nYour Friend,\nArjun",
    difficulty: "hard",
    marks: 10,
    tags: ["letter-writing", "composition", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Writing",
    question_type: "long_answer",
    question_text: "My school (Word Limit: 150-200 words)",
    options: null,
    answer: "My school is one of the best schools in my city. It has large classrooms, a library, science laboratories, and a playground. The teachers are helpful and encourage students to learn new things. Many cultural and sports activities are organized throughout the year. I love my school because it helps me become a better student and a better person.",
    difficulty: "medium",
    marks: 10,
    tags: ["essay-writing", "composition", "unit-test-1"]
  },
  {
    class_name: "1",
    subject: "English",
    chapter: "Case Study",
    question_type: "case_study",
    question_text: "A village faced severe water shortage during summer. The villagers started rainwater harvesting and planted trees. After a few months, the water level improved.",
    options: {
      subQuestions: [
        { label: "(a)", text: "What problem did the village face?", marks: 3, answer: "Water shortage." },
        { label: "(b)", text: "What solution did the villagers use?", marks: 3, answer: "Rainwater harvesting and tree plantation." },
        { label: "(c)", text: "What was the result?", marks: 4, answer: "The water level improved." }
      ]
    },
    answer: "(a) Water shortage. (b) Rainwater harvesting and tree plantation. (c) The water level improved.",
    difficulty: "hard",
    marks: 10,
    tags: ["case-study", "environment", "unit-test-1"]
  }
];

async function seedUnitTestPaper() {
  console.log("=================================================");
  console.log("📝 SEEDING UNIT TEST I ENGLISH QUESTION PAPER");
  console.log("=================================================\n");

  const institutes = [1, 2, 3];

  for (const instId of institutes) {
    console.log(`\n📌 Processing Institute ID: ${instId}...`);

    // 1. Seed into Question Bank
    let qbCount = 0;
    for (const q of unitTestQuestions) {
      await pool.query(
        `INSERT INTO question_bank
           (class_group, class_specific, subject, chapter, question_type, question_text,
            options, answer, difficulty, marks, tags, institute_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT DO NOTHING`,
        [
          '1-2',
          q.class_name,
          q.subject,
          q.chapter,
          q.question_type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.answer,
          q.difficulty,
          q.marks,
          q.tags,
          instId
        ]
      );
      qbCount++;
    }
    console.log(`   ✅ Seeded ${qbCount} questions into Question Bank`);

    // 2. Fetch class_id for Class 1 and subject_id for English in this institute
    const classRes = await pool.query(
      `SELECT class_id FROM class WHERE (class_name ILIKE '%1%' OR class_name ILIKE '%Class 1%') AND institute_id = $1 LIMIT 1`,
      [instId]
    );
    const subjectRes = await pool.query(
      `SELECT subject_id FROM subject WHERE subject_name ILIKE '%English%' LIMIT 1`
    );

    const classId = classRes.rows[0]?.class_id || null;
    const subjectId = subjectRes.rows[0]?.subject_id || null;

    // 3. Create pre-built Question Paper record
    const paperRes = await pool.query(
      `INSERT INTO question_papers
         (title, class_id, subject_id, total_marks, duration_mins, instructions, status, is_template, institute_id)
       VALUES ($1, $2, $3, 100, 180, $4, 'Published', false, $5)
       RETURNING paper_id`,
      [
        "Unit Test I - English (Class 1)",
        classId,
        subjectId,
        JSON.stringify([
          "All questions are compulsory.",
          "Write neatly and legibly.",
          "Show all working where required."
        ]),
        instId
      ]
    );

    const paperId = paperRes.rows[0].paper_id;
    console.log(`   ✅ Created Question Paper ID: ${paperId} ("Unit Test I - English")`);

    // 4. Create Paper Sections & Questions
    const sections = [
      { name: "Q.1 Multiple Choice Questions", marks: 20, order: 1 },
      { name: "Q.2 Fill in the Blanks", marks: 20, order: 2 },
      { name: "Q.3 True or False", marks: 20, order: 3 },
      { name: "Q.4 One Line Answer", marks: 20, order: 4 },
      { name: "Q.5 Match the Following", marks: 10, order: 5 },
      { name: "Q.6 Short Answer", marks: 20, order: 6 },
      { name: "Q.7 Long Answer", marks: 10, order: 7 },
      { name: "Q.8 Passage Based Question", marks: 10, order: 8 },
      { name: "Q.9 Diagram Based Question", marks: 10, order: 9 },
      { name: "Q.10 Calculation", marks: 10, order: 10 },
      { name: "Q.11 Word Problem", marks: 10, order: 11 },
      { name: "Q.12 Give Reasons", marks: 10, order: 12 },
      { name: "Q.13 Letter Writing", marks: 10, order: 13 },
      { name: "Q.14 Essay Writing", marks: 10, order: 14 },
      { name: "Q.15 Case Study", marks: 10, order: 15 }
    ];

    for (const sec of sections) {
      const secRes = await pool.query(
        `INSERT INTO paper_sections (paper_id, section_name, section_order, total_section_marks)
         VALUES ($1, $2, $3, $4) RETURNING section_id`,
        [paperId, sec.name, sec.order, sec.marks]
      );
      const sectionId = secRes.rows[0].section_id;

      // Filter matching questions for this section
      let matchingQuestions = [];
      if (sec.order === 1) matchingQuestions = unitTestQuestions.slice(0, 2);
      else if (sec.order === 2) matchingQuestions = unitTestQuestions.slice(2, 4);
      else if (sec.order === 3) matchingQuestions = unitTestQuestions.slice(4, 6);
      else if (sec.order === 4) matchingQuestions = unitTestQuestions.slice(6, 8);
      else if (sec.order === 5) matchingQuestions = unitTestQuestions.slice(8, 9);
      else if (sec.order === 6) matchingQuestions = unitTestQuestions.slice(9, 11);
      else if (sec.order === 7) matchingQuestions = unitTestQuestions.slice(11, 12);
      else if (sec.order === 8) matchingQuestions = unitTestQuestions.slice(12, 13);
      else if (sec.order === 9) matchingQuestions = unitTestQuestions.slice(13, 14);
      else if (sec.order === 10) matchingQuestions = unitTestQuestions.slice(14, 15);
      else if (sec.order === 11) matchingQuestions = unitTestQuestions.slice(15, 16);
      else if (sec.order === 12) matchingQuestions = unitTestQuestions.slice(16, 17);
      else if (sec.order === 13) matchingQuestions = unitTestQuestions.slice(17, 18);
      else if (sec.order === 14) matchingQuestions = unitTestQuestions.slice(18, 19);
      else if (sec.order === 15) matchingQuestions = unitTestQuestions.slice(19, 20);

      let qOrder = 1;
      for (const q of matchingQuestions) {
        await pool.query(
          `INSERT INTO questions
             (section_id, question_type, question_text, question_data, marks, question_order, difficulty, answer_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sectionId,
            q.question_type,
            q.question_text,
            JSON.stringify({ options: q.options }),
            q.marks,
            qOrder++,
            q.difficulty,
            q.answer
          ]
        );
      }
    }
    console.log(`   ✅ Successfully populated all 15 sections & questions for Institute ${instId}!`);
  }

  await pool.end();
  console.log("\n=================================================");
  console.log("🎉 ALL QUESTIONS FED INTO QUESTION BANK & GENERATOR");
  console.log("=================================================");
}

seedUnitTestPaper();
