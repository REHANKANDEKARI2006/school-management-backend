import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const SectionModel = {
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
