// src/models/paper_format_templates_model.js
import pool from "../config/db.js";

// Maps a class number to its group string
function resolveClassGroup(className) {
  const n = parseInt(className, 10);
  if (n <= 2)  return '1-2';
  if (n <= 5)  return '3-5';
  if (n <= 8)  return '6-8';
  return '9-10';
}

const PaperFormatTemplatesModel = {

  // Fetch with fallback chain: 
  // 1. class_name + subject + exam_type
  // 2. class_name + subject (base)
  // 3. class_group + subject + exam_type
  // 4. class_group + subject (base)
  async getTemplate({ class_name, subject, exam_type }, instituteId) {
    const class_group = resolveClassGroup(class_name);

    // Try specific class_name first
    if (class_name) {
      if (exam_type) {
        const { rows } = await pool.query(`
          SELECT * FROM paper_format_templates
          WHERE class_name = $1 AND subject = $2 AND exam_type = $3 AND institute_id = $4
          LIMIT 1
        `, [class_name, subject, exam_type, instituteId]);
        if (rows[0]) return rows[0];
      }
      const { rows } = await pool.query(`
        SELECT * FROM paper_format_templates
        WHERE class_name = $1 AND subject = $2 AND exam_type IS NULL AND institute_id = $3
        LIMIT 1
      `, [class_name, subject, instituteId]);
      if (rows[0]) return rows[0];
    }

    // Fallback to class_group
    if (exam_type) {
      const { rows } = await pool.query(`
        SELECT * FROM paper_format_templates
        WHERE class_group = $1 AND subject = $2 AND exam_type = $3 AND institute_id = $4
        LIMIT 1
      `, [class_group, subject, exam_type, instituteId]);
      if (rows[0]) return rows[0];
    }

    const { rows } = await pool.query(`
      SELECT * FROM paper_format_templates
      WHERE class_group = $1 AND subject = $2 AND exam_type IS NULL AND institute_id = $3
      LIMIT 1
    `, [class_group, subject, instituteId]);
    return rows[0] || null;
  },

  // List all templates (for admin management)
  async listAll(instituteId) {
    const { rows } = await pool.query(`
      SELECT template_id, class_group, subject, exam_type, total_marks, duration_mins, updated_at
      FROM paper_format_templates
      WHERE institute_id = $1
      ORDER BY class_group, subject, exam_type NULLS FIRST
    `, [instituteId]);
    return rows;
  },

  // Get one by ID
  async getById(template_id, instituteId) {
    const { rows } = await pool.query(`
      SELECT * FROM paper_format_templates WHERE template_id = $1 AND institute_id = $2
    `, [template_id, instituteId]);
    return rows[0] || null;
  }
};

export default PaperFormatTemplatesModel;
