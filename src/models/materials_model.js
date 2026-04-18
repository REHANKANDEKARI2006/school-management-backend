// models/materials_model.js
import pool from "../config/db.js";

const MaterialsModel = {

  // Create Material
  async create({ material_name, subject_id, class_id, file_path, upload_date }) {
    const query = `
      INSERT INTO materials
      (material_name, subject_id, class_id, file_path, upload_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [material_name, subject_id, class_id, file_path, upload_date];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Get All Materials
  async findAll(class_id = null) {
    let query = `
      SELECT 
        m.material_id, 
        m.material_name, 
        m.subject_id, 
        sub.subject_name,
        m.class_id, 
        c.class_name,
        s.section_name,
        m.file_path, 
        m.upload_date, 
        m.updated_at
      FROM materials m
      JOIN class c ON c.class_id = m.class_id
      LEFT JOIN section s ON s.section_id = c.section_id
      JOIN subject sub ON sub.subject_id = m.subject_id
    `;
    
    const values = [];
    if (class_id) {
      query += ` WHERE m.class_id = $1 `;
      values.push(class_id);
    }
    
    query += ` ORDER BY m.material_id DESC; `;
    
    const { rows } = await pool.query(query, values);
    return rows;
  },

  // Get Material By ID
  async findById(id) {
    const query = `
      SELECT m.*, c.class_name, s.section_name 
      FROM materials m
      JOIN class c ON c.class_id = m.class_id
      LEFT JOIN section s ON s.section_id = c.section_id
      WHERE m.material_id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Update Material
  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;

    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const query = `
      UPDATE materials
      SET ${setClause}, updated_at = now()
      WHERE material_id = $${keys.length + 1}
      RETURNING *;
    `;

    const values = [...Object.values(fields), id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Delete Material
  async delete(id) {
    const query = `DELETE FROM materials WHERE material_id = $1`;
    await pool.query(query, [id]);
    return true;
  }
};

export default MaterialsModel;
