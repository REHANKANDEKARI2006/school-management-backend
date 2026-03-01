// src/models/question_paper_model.js
import pool from "../config/db.js";

const QuestionPaperModel = {

    async saveQuestionPaper(data) {
        const { exam_id, template_id, content, passage } = data;
        const query = `
      INSERT INTO question_papers (exam_id, template_id, content, passage, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (exam_id)
      DO UPDATE SET 
        template_id = EXCLUDED.template_id,
        content = EXCLUDED.content,
        passage = EXCLUDED.passage,
        updated_at = now()
      RETURNING *
    `;
        const values = [exam_id, template_id, content, passage];
        const { rows } = await pool.query(query, values);
        return rows[0];
    },

    async getQuestionPaperByExamId(exam_id) {
        const query = `SELECT * FROM question_papers WHERE exam_id = $1`;
        const { rows } = await pool.query(query, [exam_id]);
        return rows[0] || null;
    }

};

export default QuestionPaperModel;
