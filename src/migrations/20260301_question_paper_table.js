// src/migrations/20260301_question_paper_table.js
import db from '../config/db.js';

export async function createQuestionPaperTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS question_papers (
        paper_id   SERIAL PRIMARY KEY,
        exam_id    INTEGER NOT NULL UNIQUE,
        template_id VARCHAR(50),
        content    JSONB NOT NULL,
        passage    TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT question_paper_exam_id_fkey
          FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE CASCADE
      )
    `);
        console.log('question_papers table ensured.');
    } catch (error) {
        console.error('createQuestionPaperTable error:', error);
    }
}

export async function dropQuestionPaperTable() {
    try {
        await db.query('DROP TABLE IF EXISTS question_papers CASCADE');
        console.log('question_papers table dropped.');
    } catch (error) {
        console.error('dropQuestionPaperTable error:', error);
    }
}

// createQuestionPaperTable();
