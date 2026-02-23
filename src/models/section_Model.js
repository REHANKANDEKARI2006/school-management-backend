import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const SectionModel = {

  async getAll() {
    const { rows } = await pool.query(`
      SELECT section_id, section_name
      FROM section
      ORDER BY section_name
    `);
    return rows;
  },

  async getByClass(classId) {
    const { rows } = await pool.query(`
      SELECT 
        sec.section_id,
        sec.section_name
      FROM class_section cs
      JOIN section sec 
        ON sec.section_id = cs.section_id
      WHERE cs.class_id = $1
      ORDER BY sec.section_name
    `, [classId]);

    return rows;
  }
};
