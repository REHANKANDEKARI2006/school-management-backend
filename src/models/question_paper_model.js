// src/models/question_paper_model.js
import pool from "../config/db.js";

const QuestionPaperModel = {
  // 1. Create a new paper draft (Step 1 of Wizard)
  async createDraft(data) {
    const { exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions } = data;
    const query = `
      INSERT INTO question_papers (exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
      RETURNING *
    `;
    const values = [exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // 2. Update paper metadata
  async updatePaper(id, data) {
    const fields = [];
    const values = [];
    let i = 1;

    const allowedFields = ['title', 'total_marks', 'duration_mins', 'instructions', 'status', 'is_template'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    const query = `
      UPDATE question_papers 
      SET ${fields.join(', ')}, updated_at = now() 
      WHERE paper_id = $${i} 
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // 3. Hierarchical Get
  async getById(paper_id) {
    const paperQuery = `
      SELECT qp.*, c.class_name, s.subject_name, e.exam_name
      FROM question_papers qp
      LEFT JOIN class c ON c.class_id = qp.class_id
      LEFT JOIN subject s ON s.subject_id = qp.subject_id
      LEFT JOIN exam e ON e.exam_id = qp.exam_id
      WHERE qp.paper_id = $1
    `;
    const { rows: [paper] } = await pool.query(paperQuery, [paper_id]);
    if (!paper) return null;

    const sectionsQuery = `
      SELECT * FROM paper_sections
      WHERE paper_id = $1
      ORDER BY section_order ASC
    `;
    const { rows: sections } = await pool.query(sectionsQuery, [paper_id]);

    for (let section of sections) {
      const questionsQuery = `
        SELECT * FROM questions
        WHERE section_id = $1
        ORDER BY question_order ASC
      `;
      const { rows: questions } = await pool.query(questionsQuery, [section.section_id]);
      section.questions = questions;
    }

    paper.sections = sections;
    return paper;
  },

  // 4. List papers
  async list({ class_id, subject_id, status, is_template, limit = 50, offset = 0 }) {
    let query = `
      SELECT qp.*, c.class_name, s.subject_name
      FROM question_papers qp
      LEFT JOIN class c ON c.class_id = qp.class_id
      LEFT JOIN subject s ON s.subject_id = qp.subject_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (class_id) { query += ` AND qp.class_id = $${i++}`; params.push(class_id); }
    if (subject_id) { query += ` AND qp.subject_id = $${i++}`; params.push(subject_id); }
    if (status) { query += ` AND qp.status = $${i++}`; params.push(status); }
    if (is_template !== undefined) { query += ` AND qp.is_template = $${i++}`; params.push(is_template); }

    query += ` ORDER BY qp.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // 5. Delete
  async delete(id) {
    await pool.query('DELETE FROM question_papers WHERE paper_id = $1', [id]);
    return true;
  },

  // 6. Upcoming Exams for Setup (Step 1)
  async getUpcomingExams() {
    const query = `
      SELECT 
        e.exam_id, e.exam_name, e.total_score, e.date_time,
        c.class_id, c.class_name,
        s.subject_id, s.subject_name
      FROM exam e
      JOIN class c ON c.class_id = e.class_id
      JOIN subject s ON s.subject_id = e.subject_id
      WHERE e.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM exam_grades eg WHERE eg.exam_id = e.exam_id
      )
      ORDER BY e.date_time ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  // 7. Duplicate
  async duplicate(id, newTitle) {
    const oldPaper = await this.getById(id);
    if (!oldPaper) throw new Error('Paper not found');

    const newPaper = await this.createDraft({
      ...oldPaper,
      title: newTitle || `Copy of ${oldPaper.title}`,
      exam_id: null // Reset exam link for duplicates
    });

    for (const section of oldPaper.sections) {
      const newSection = await pool.query(
        `INSERT INTO paper_sections (paper_id, section_name, section_order, total_section_marks) VALUES ($1, $2, $3, $4) RETURNING *`,
        [newPaper.paper_id, section.section_name, section.section_order, section.total_section_marks]
      );
      const section_id = newSection.rows[0].section_id;

      for (const question of section.questions) {
        await pool.query(
          `INSERT INTO questions (section_id, question_type, question_text, question_data, marks, question_order) VALUES ($1, $2, $3, $4, $5, $6)`,
          [section_id, question.question_type, question.question_text, JSON.stringify(question.question_data), question.marks, question.question_order]
        );
      }
    }
    return this.getById(newPaper.paper_id);
  },

  // 8. Section & Question Management
  async upsertSection(section_id, paper_id, data) {
    const isUpdate = section_id && !isNaN(parseInt(section_id)) && parseInt(section_id) > 0;
    if (isUpdate) {
      const { rows } = await pool.query(
        `UPDATE paper_sections SET section_name = $1, section_order = $2, total_section_marks = $3 WHERE section_id = $4 RETURNING *`,
        [data.section_name, data.section_order, data.total_section_marks, section_id]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO paper_sections (paper_id, section_name, section_order, total_section_marks) VALUES ($1, $2, $3, $4) RETURNING *`,
        [paper_id, data.section_name, data.section_order, data.total_section_marks]
      );
      return rows[0];
    }
  },

  async upsertQuestion(question_id, section_id, data) {
    const isUpdate = question_id && !isNaN(parseInt(question_id)) && parseInt(question_id) > 0;
    if (isUpdate) {
      const { rows } = await pool.query(
        `UPDATE questions SET question_type = $1, question_text = $2, question_data = $3, marks = $4, question_order = $5 WHERE question_id = $6::integer RETURNING *`,
        [data.question_type, data.question_text, JSON.stringify(data.question_data), data.marks, data.question_order, question_id]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO questions (section_id, question_type, question_text, question_data, marks, question_order) VALUES ($1::integer, $2, $3, $4, $5, $6) RETURNING *`,
        [section_id, data.question_type, data.question_text, JSON.stringify(data.question_data), data.marks, data.question_order]
      );
      return rows[0];
    }
  },

  async deleteSection(section_id) {
    await pool.query('DELETE FROM paper_sections WHERE section_id = $1', [section_id]);
    return true;
  },

  async deleteQuestion(question_id) {
    await pool.query('DELETE FROM questions WHERE question_id = $1', [question_id]);
    return true;
  }
};

export default QuestionPaperModel;
