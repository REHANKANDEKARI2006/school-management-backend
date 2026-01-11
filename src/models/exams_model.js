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
      status_id
    } = data;

    const query = `
      INSERT INTO exam
      (exam_name, exam_type_id, class_id, subject_id, date_time,
       duration_mins, total_score, min_marks, max_marks, status_id)
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
      min_marks,
      max_marks,
      status_id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async getAllExams() {
    const query = `
      SELECT e.*, et.exam_type_name
      FROM exam e
      JOIN exam_type et ON et.exam_type_id = e.exam_type_id
      ORDER BY e.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async updateExam(id, data) {
    const query = `
      UPDATE exam
      SET exam_name=$1, date_time=$2, duration_mins=$3,
          total_score=$4, min_marks=$5, max_marks=$6, status_id=$7,
          updated_at=now()
      WHERE exam_id=$8
      RETURNING *
    `;

    const values = [
      data.exam_name,
      data.date_time,
      data.duration_mins,
      data.total_score,
      data.min_marks,
      data.max_marks,
      data.status_id,
      id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async deleteExam(id) {
    await pool.query(`DELETE FROM exam WHERE exam_id=$1`, [id]);
    return true;
  },

  async getExamTypes() {
    const { rows } = await pool.query(`SELECT * FROM exam_type`);
    return rows;
  },

  async addGrades(exam_id, data) {
    const { student_id, marks_obtained, grade } = data;

    const query = `
      INSERT INTO exam_grades
      (exam_id, student_id, marks_obtained, grade)
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [
      exam_id,
      student_id,
      marks_obtained,
      grade
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

};

export default ExamsModel;
