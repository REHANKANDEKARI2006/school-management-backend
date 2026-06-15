// src/models/question_paper_model.js
import pool from "../config/db.js";

const QuestionPaperModel = {
  // 1. Create a new paper draft (Step 1 of Wizard)
  async createDraft(data, instituteId) {
    const { exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions } = data;
    const query = `
      INSERT INTO question_papers (exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions, status, institute_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft', $8)
      RETURNING *
    `;
    const values = [exam_id, title, class_id, subject_id, total_marks, duration_mins, instructions, instituteId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // 2. Update paper metadata
  async updatePaper(id, data, instituteId) {
    const fields = [];
    const values = [];
    let i = 1;

    const allowedFields = ['title', 'total_marks', 'duration_mins', 'instructions', 'status', 'is_template', 'passing_marks', 'difficulty_level', 'shuffle_questions', 'shuffle_options', 'show_marks', 'show_instructions', 'exam_id', 'class_id', 'subject_id'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.getById(id, instituteId);

    values.push(id);
    values.push(instituteId);
    const query = `
      UPDATE question_papers 
      SET ${fields.join(', ')}, updated_at = now() 
      WHERE paper_id = $${i} AND institute_id = $${i + 1}
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // 3. Hierarchical Get
  async getById(paper_id, instituteId) {
    const paperQuery = `
      SELECT qp.*, c.class_name, s.subject_name, e.exam_name, e.date_time
      FROM question_papers qp
      LEFT JOIN class c ON c.class_id = qp.class_id
      LEFT JOIN subject s ON s.subject_id = qp.subject_id
      LEFT JOIN exam e ON e.exam_id = qp.exam_id
      WHERE qp.paper_id = $1 AND qp.institute_id = $2
    `;
    const { rows: [paper] } = await pool.query(paperQuery, [paper_id, instituteId]);
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
  async list({ class_id, subject_id, status, is_template, limit = 50, offset = 0 }, instituteId) {
    let query = `
      SELECT qp.*, c.class_name, s.subject_name
      FROM question_papers qp
      LEFT JOIN class c ON c.class_id = qp.class_id
      LEFT JOIN subject s ON s.subject_id = qp.subject_id
      WHERE qp.institute_id = $1
    `;
    const params = [instituteId];
    let i = 2;

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
  async delete(id, instituteId) {
    await pool.query('DELETE FROM question_papers WHERE paper_id = $1 AND institute_id = $2', [id, instituteId]);
    return true;
  },

  // 6. Upcoming Exams for Setup (Step 1)
  async getUpcomingExams(instituteId) {
    const query = `
      SELECT 
        e.exam_id, e.exam_name, e.total_score, e.date_time, e.duration_mins,
        c.class_id, c.class_name,
        s.subject_id, s.subject_name
      FROM exam e
      JOIN class c ON c.class_id = e.class_id
      JOIN subject s ON s.subject_id = e.subject_id
      WHERE e.is_deleted = false AND e.institute_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM exam_grades eg WHERE eg.exam_id = e.exam_id
      )
      ORDER BY e.date_time ASC
    `;
    const { rows } = await pool.query(query, [instituteId]);
    return rows;
  },

  // 7. Duplicate
  async duplicate(id, newTitle, instituteId) {
    const oldPaper = await this.getById(id, instituteId);
    if (!oldPaper) throw new Error('Paper not found or unauthorized');

    const newPaper = await this.createDraft({
      ...oldPaper,
      title: newTitle || `Copy of ${oldPaper.title}`,
      exam_id: null // Reset exam link for duplicates
    }, instituteId);

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
    return this.getById(newPaper.paper_id, instituteId);
  },

  // 8. Section & Question Management
  async upsertSection(section_id, paper_id, data, instituteId) {
    // Verify paper ownership
    const paperCheck = await pool.query('SELECT 1 FROM question_papers WHERE paper_id = $1 AND institute_id = $2', [paper_id, instituteId]);
    if (paperCheck.rows.length === 0) {
      throw new Error('Unauthorized or paper not found');
    }

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

  async upsertQuestion(question_id, section_id, data, instituteId) {
    const sectionCheck = await pool.query(
      `SELECT 1 FROM paper_sections ps 
       JOIN question_papers qp ON qp.paper_id = ps.paper_id
       WHERE ps.section_id = $1 AND qp.institute_id = $2`, 
      [section_id, instituteId]
    );
    if (sectionCheck.rows.length === 0) {
      throw new Error('Unauthorized or section not found');
    }

    const isUpdate = question_id && !isNaN(parseInt(question_id)) && parseInt(question_id) > 0;
    if (isUpdate) {
      const { rows } = await pool.query(
        `UPDATE questions SET question_type = $1, question_text = $2, question_data = $3, marks = $4, question_order = $5, difficulty = $7, answer_key = $8, explanation = $9, blooms_taxonomy = $10 WHERE question_id = $6::integer RETURNING *`,
        [data.question_type, data.question_text, JSON.stringify(data.question_data), data.marks, data.question_order, question_id, data.difficulty || 'Medium', data.answer_key || null, data.explanation || null, data.blooms_taxonomy || null]
      );
      return rows[0];
    } else {
      // Shift all questions in the same section with order >= target_order up by 1
      if (data.question_order !== undefined) {
        await pool.query(
          `UPDATE questions SET question_order = question_order + 1 WHERE section_id = $1::integer AND question_order >= $2`,
          [section_id, data.question_order]
        );
      }
      const { rows } = await pool.query(
        `INSERT INTO questions (section_id, question_type, question_text, question_data, marks, question_order, difficulty, answer_key, explanation, blooms_taxonomy) VALUES ($1::integer, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [section_id, data.question_type, data.question_text, JSON.stringify(data.question_data), data.marks, data.question_order, data.difficulty || 'Medium', data.answer_key || null, data.explanation || null, data.blooms_taxonomy || null]
      );
      return rows[0];
    }
  },

  async deleteSection(section_id, instituteId) {
    const sectionCheck = await pool.query(
      `SELECT 1 FROM paper_sections ps 
       JOIN question_papers qp ON qp.paper_id = ps.paper_id
       WHERE ps.section_id = $1 AND qp.institute_id = $2`, 
      [section_id, instituteId]
    );
    if (sectionCheck.rows.length === 0) {
      throw new Error('Unauthorized or section not found');
    }
    await pool.query('DELETE FROM paper_sections WHERE section_id = $1', [section_id]);
    return true;
  },

  async deleteQuestion(question_id, instituteId) {
    const questionCheck = await pool.query(
      `SELECT 1 FROM questions q
       JOIN paper_sections ps ON ps.section_id = q.section_id
       JOIN question_papers qp ON qp.paper_id = ps.paper_id
       WHERE q.question_id = $1 AND qp.institute_id = $2`, 
      [question_id, instituteId]
    );
    if (questionCheck.rows.length === 0) {
      throw new Error('Unauthorized or question not found');
    }
    await pool.query('DELETE FROM questions WHERE question_id = $1', [question_id]);
    return true;
  }
};

export default QuestionPaperModel;
