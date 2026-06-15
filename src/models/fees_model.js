// src/models/fees_model.js
import pool from "../config/db.js";

export const FeesModel = {

  async getAllCategories() {
    const res = await pool.query(`
      SELECT
        fee_category_id,
        category_name,
        description,
        allow_installments,
        is_active
      FROM fee_category
      WHERE is_active = true
      ORDER BY fee_category_id
    `);
    return res.rows;
  },

  async createCategory({ category_name, description, allow_installments }) {
    const res = await pool.query(
      `
      INSERT INTO fee_category
        (category_name, description, allow_installments)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [category_name, description, allow_installments ?? false]
    );
    return res.rows[0];
  },

  async updateCategory(id, { category_name, description, is_active, allow_installments }) {
    const res = await pool.query(
      `
      UPDATE fee_category
      SET
        category_name = $1,
        description = $2,
        is_active = $3,
        allow_installments = COALESCE($4, allow_installments),
        updated_at = now()
      WHERE fee_category_id = $5
      RETURNING *
      `,
      [category_name, description, is_active, allow_installments, id]
    );
    return res.rows[0];
  },

  async deleteCategory(id) {
    await pool.query(
      `DELETE FROM fee_category WHERE fee_category_id=$1`,
      [id]
    );
  },

  async getFeeStructures(instituteId) {
    const res = await pool.query(`
      SELECT
        fs.*,
        c.class_name,
        fc.category_name
      FROM fee_structure fs
      JOIN class c ON c.class_id = fs.class_id
      JOIN fee_category fc ON fc.fee_category_id = fs.fee_cat_id
      WHERE fs.institute_id = $1
      ORDER BY fs.fee_struct_id
    `, [instituteId]);
    return res.rows;
  },

  async createFeeStructure(data, instituteId) {
    const {
      class_id,
      section_id,
      fee_cat_id,
      amount,
      due_date,
      session_year
    } = data;

    const res = await pool.query(
      `
      INSERT INTO fee_structure
        (class_id, section_id, fee_cat_id, amount, due_date, session_year, institute_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [class_id, section_id ?? null, fee_cat_id, amount, due_date ?? null, session_year ?? null, Number(instituteId)]
    );

    return res.rows[0];
  },

  async getInstallmentsByStructure(feeStructId) {
    const res = await pool.query(
      `SELECT * FROM fee_installment WHERE fee_struct_id=$1 ORDER BY installment_no`,
      [feeStructId]
    );
    return res.rows;
  },

  async collectFee(data) {
    const {
      student_id,
      fee_struct_id,
      amount_paid,
      payment_date,
      installment_no,
      receipt_no
    } = data;

    const insertRes = await pool.query(
      `
      INSERT INTO fee_collection
        (student_id, fee_struct_id, amount_paid, payment_date, installment_no, receipt_no)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        student_id,
        fee_struct_id,
        amount_paid,
        payment_date ?? new Date(),
        installment_no ?? null,
        receipt_no ?? null
      ]
    );
    const row = insertRes.rows[0];

    // Auto-generate receipt number if it doesn't exist
    if (!row.receipt_no) {
      const year = new Date(row.payment_date).getFullYear();
      const generatedReceiptNo = `REC-${year}-${String(row.collection_id).padStart(4, '0')}`;
      
      const updateRes = await pool.query(
        `UPDATE fee_collection SET receipt_no = $1 WHERE collection_id = $2 RETURNING *`,
        [generatedReceiptNo, row.collection_id]
      );
      return updateRes.rows[0];
    }

    return row;
  },

  async getStudentFeeCollection(studentId) {
    const res = await pool.query(
      `
      SELECT
        fc.*,
        fs.amount AS total_amount,
        fc_cat.category_name
      FROM fee_collection fc
      JOIN fee_structure fs ON fs.fee_struct_id = fc.fee_struct_id
      JOIN fee_category fc_cat ON fs.fee_cat_id = fc_cat.fee_category_id
      WHERE fc.student_id = $1
      ORDER BY fc.payment_date DESC, fc.collection_id DESC
      `,
      [studentId]
    );
    return res.rows;
  },

  async getFeeStatusByClass(classId) {
    const res = await pool.query(
      `
      SELECT
        s.student_id,
        s.stu_first_name,
        s.stu_last_name,
        ce.class_id,
        (SELECT COALESCE(SUM(amount), 0) FROM fee_structure WHERE class_id = ce.class_id) as total_fees,
        COALESCE(paid_table.total_paid, 0) as total_paid
      FROM student s
      INNER JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN (
        SELECT student_id, SUM(amount_paid) as total_paid
        FROM fee_collection
        GROUP BY student_id
      ) paid_table ON paid_table.student_id = s.student_id
      WHERE ce.class_id = $1
      ORDER BY s.stu_first_name ASC, s.stu_last_name ASC
      `,
      [classId]
    );
    return res.rows;
  },

  async getStudentDetailedFeeStatus(studentId) {
    const res = await pool.query(
      `
      SELECT
        fs.fee_struct_id,
        fc_cat.category_name,
        fs.amount as total_amount,
        COALESCE(SUM(fc.amount_paid), 0) as paid_amount,
        fs.due_date
      FROM fee_structure fs
      JOIN fee_category fc_cat ON fs.fee_cat_id = fc_cat.fee_category_id
      JOIN class_enrollment ce ON ce.class_id = fs.class_id AND ce.status_id = 1
      LEFT JOIN fee_collection fc ON fc.student_id = ce.student_id AND fc.fee_struct_id = fs.fee_struct_id
      WHERE ce.student_id = $1
      GROUP BY fs.fee_struct_id, fc_cat.category_name, fs.amount, fs.due_date
      ORDER BY fs.due_date ASC
      `,
      [studentId]
    );
    return res.rows;
  },

  async updateFeeStructure(standardName, feeCatId, newAmount, instituteId) {
    const { rows } = await pool.query(
      `
      UPDATE fee_structure
      SET amount = $1
      WHERE fee_cat_id = $2
        AND class_id IN (SELECT class_id FROM class WHERE class_name = $3 AND institute_id = $4)
        AND institute_id = $4
      RETURNING *
      `,
      [newAmount, feeCatId, standardName, Number(instituteId)]
    );
    return rows;
  },

  async deleteFeeStructure(standardName, feeCatId, instituteId) {
    const { rows } = await pool.query(
      `
      DELETE FROM fee_structure
      WHERE fee_cat_id = $1
        AND class_id IN (SELECT class_id FROM class WHERE class_name = $2 AND institute_id = $3)
        AND institute_id = $3
      RETURNING *
      `,
      [feeCatId, standardName, Number(instituteId)]
    );
    return rows;
  }
};
