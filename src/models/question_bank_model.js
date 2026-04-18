// src/models/question_bank_model.js
import pool from "../config/db.js";

function resolveClassGroup(className) {
  if (!className) return null;
  const n = parseInt(className, 10);
  if (n <= 2)  return '1-2';
  if (n <= 5)  return '3-5';
  if (n <= 8)  return '6-8';
  return '9-10';
}

const QuestionBankModel = {

  // ─── Add a question ───────────────────────────────────────────
  async addQuestion(data) {
    const { class_name, subject, chapter, question_type, question_text,
            options, answer, difficulty, marks, tags, added_by } = data;
    const class_group = resolveClassGroup(class_name);
    const { rows } = await pool.query(`
      INSERT INTO question_bank
        (class_group, class_specific, subject, chapter, question_type, question_text,
         options, answer, difficulty, marks, tags, added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [class_group, class_name || null, subject, chapter, question_type,
        question_text, options ? JSON.stringify(options) : null, answer,
        difficulty || 'medium', marks || 1, tags || [], added_by]);
    return rows[0];
  },

  // ─── Bulk add (CSV import) ────────────────────────────────────
  async bulkAdd(questions) {
    const results = [];
    for (const q of questions) {
      results.push(await this.addQuestion(q));
    }
    return results;
  },

  // ─── Search/filter questions ──────────────────────────────────
  async search({ class_name, subject, chapter, question_type, difficulty, search, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (class_name) {
      const class_group = resolveClassGroup(class_name);
      conditions.push(`class_group = $${idx++}`);
      values.push(class_group);
    }
    if (subject)       { conditions.push(`subject = $${idx++}`);        values.push(subject); }
    if (chapter)       { conditions.push(`chapter ILIKE $${idx++}`);    values.push(`%${chapter}%`); }
    if (question_type) { conditions.push(`question_type = $${idx++}`);  values.push(question_type); }
    if (difficulty)    { conditions.push(`difficulty = $${idx++}`);     values.push(difficulty); }
    if (search)        { conditions.push(`question_text ILIKE $${idx++}`); values.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT question_id, class_group, class_specific, subject, chapter,
             question_type, question_text, options, difficulty, marks, tags, created_at
      FROM question_bank ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, values);
    return rows;
  },

  // ─── Get question with answer (for answer key) ────────────────
  async getById(question_id) {
    const { rows } = await pool.query(
      `SELECT * FROM question_bank WHERE question_id = $1`, [question_id]);
    return rows[0] || null;
  },

  // ─── Update question ──────────────────────────────────────────
  async update(question_id, data) {
    const allowed = ['subject','chapter','question_type','question_text',
                     'options','answer','difficulty','marks','tags'];
    const updates = [];
    const values  = [];
    let   idx     = 1;
    for (const f of allowed) {
      if (data[f] !== undefined) {
        updates.push(`${f} = $${idx}`);
        values.push(f === 'options' ? JSON.stringify(data[f]) : data[f]);
        idx++;
      }
    }
    if (!updates.length) return this.getById(question_id);
    values.push(question_id);
    const { rows } = await pool.query(`
      UPDATE question_bank SET ${updates.join(', ')}
      WHERE question_id = $${idx} RETURNING *
    `, values);
    return rows[0];
  },

  // ─── Delete ───────────────────────────────────────────────────
  async delete(question_id) {
    await pool.query(`DELETE FROM question_bank WHERE question_id = $1`, [question_id]);
  }
};

export default QuestionBankModel;
