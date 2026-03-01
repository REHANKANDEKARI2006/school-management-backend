import pool from "../config/db.js";

const ExamsModel = {

  async createExam(data) {
    const {
      exam_name,
      exam_type_id,
      class_id,
      subject_id,
      date_time,
      duration_mins,
      total_score,
      min_marks,
      max_marks,
      exam_status_id
    } = data;

    const query = `
      INSERT INTO exam
      (exam_name, exam_type_id, class_id, subject_id, date_time,
       duration_mins, total_score, min_marks, max_marks, exam_status_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `;

    const values = [
      exam_name,
      exam_type_id,
      class_id,
      subject_id,
      date_time,
      duration_mins,
      total_score,
      min_marks || null,
      max_marks || null,
      exam_status_id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async getAllExams() {
    const query = `
      SELECT
        e.exam_id,
        e.exam_name,
        e.date_time,
        e.duration_mins,
        e.total_score,
        e.min_marks,
        e.max_marks,
        e.class_id,
        e.subject_id,
        e.exam_type_id,
        e.exam_status_id,
        e.created_at,
        et.exam_type_name,
        c.class_name,
        s.section_name,
        sub.subject_name,
        es.exam_status_name
      FROM exam e
      LEFT JOIN exam_type et ON et.exam_type_id = e.exam_type_id
      LEFT JOIN class c ON c.class_id = e.class_id
      LEFT JOIN section s ON s.section_id = c.section_id
      LEFT JOIN subject sub ON sub.subject_id = e.subject_id
      LEFT JOIN exam_status es ON es.exam_status_id = e.exam_status_id
      WHERE e.is_deleted = false
      ORDER BY e.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async getExamById(id) {
    const query = `
      SELECT
        e.*,
        et.exam_type_name,
        c.class_name,
        s.section_name,
        sub.subject_name,
        es.exam_status_name
      FROM exam e
      LEFT JOIN exam_type et ON et.exam_type_id = e.exam_type_id
      LEFT JOIN class c ON c.class_id = e.class_id
      LEFT JOIN section s ON s.section_id = c.section_id
      LEFT JOIN subject sub ON sub.subject_id = e.subject_id
      LEFT JOIN exam_status es ON es.exam_status_id = e.exam_status_id
      WHERE e.exam_id = $1 AND e.is_deleted = false
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  },

  async updateExam(id, data) {
    const query = `
      UPDATE exam
      SET exam_name=$1, date_time=$2, duration_mins=$3,
          total_score=$4, min_marks=$5, max_marks=$6,
          exam_status_id=$7, class_id=$8, subject_id=$9,
          exam_type_id=$10, updated_at=now()
      WHERE exam_id=$11
      RETURNING *
    `;

    const values = [
      data.exam_name,
      data.date_time,
      data.duration_mins,
      data.total_score,
      data.min_marks || null,
      data.max_marks || null,
      data.exam_status_id,
      data.class_id,
      data.subject_id,
      data.exam_type_id,
      id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async deleteExam(id) {
    // Soft delete the exam
    const query = `UPDATE exam SET is_deleted = true, updated_at = now() WHERE exam_id = $1`;
    await pool.query(query, [id]);
    return true;
  },

  async getExamTypes() {
    const { rows } = await pool.query(
      `SELECT exam_type_id, exam_type_name FROM exam_type ORDER BY exam_type_name`
    );
    return rows;
  },

  async getExamStatuses() {
    const { rows } = await pool.query(
      `SELECT exam_status_id, exam_status_name FROM exam_status ORDER BY exam_status_id`
    );
    return rows;
  },

  async addGrades(exam_id, data) {
    const { student_id, marks_obtained, grade } = data;

    // Upsert: update if already exists, insert if not
    const query = `
      INSERT INTO exam_grades (exam_id, student_id, marks_obtained, grade)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (exam_id, student_id)
      DO UPDATE SET marks_obtained=$3, grade=$4, updated_at=now()
      RETURNING *
    `;

    const values = [exam_id, student_id, marks_obtained, grade];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async getGrades(exam_id) {
    const query = `
      SELECT
        eg.grade_id,
        eg.exam_id,
        eg.student_id,
        eg.marks_obtained,
        eg.grade,
        eg.created_at,
        st.stu_first_name,
        st.stu_last_name
      FROM exam_grades eg
      JOIN student st ON st.student_id = eg.student_id
      WHERE eg.exam_id = $1
      ORDER BY st.stu_first_name
    `;
    const { rows } = await pool.query(query, [exam_id]);
    return rows;
  },

  async addBulkGrades(exam_id, grades) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of grades) {
        const { student_id, marks_obtained, grade } = item;
        const query = `
          INSERT INTO exam_grades (exam_id, student_id, marks_obtained, grade)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (exam_id, student_id)
          DO UPDATE SET marks_obtained = $3, grade = $4, updated_at = now()
          RETURNING *
        `;
        const { rows } = await client.query(query, [exam_id, student_id, marks_obtained, grade]);
        results.push(rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

};

export default ExamsModel;
