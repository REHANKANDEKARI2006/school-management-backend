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

  async updateCategory(id, { category_name, description, is_active }) {
    const res = await pool.query(
      `
      UPDATE fee_category
      SET
        category_name = $1,
        description = $2,
        is_active = $3,
        updated_at = now()
      WHERE fee_category_id = $4
      RETURNING *
      `,
      [category_name, description, is_active, id]
    );
    return res.rows[0];
  },

  async deleteCategory(id) {
    await pool.query(
      `UPDATE fee_category SET is_active=false WHERE fee_category_id=$1`,
      [id]
    );
  },

  async getFeeStructures() {
    const res = await pool.query(`
      SELECT
        fs.*,
        c.class_name,
        fc.category_name
      FROM fee_structure fs
      JOIN class c ON c.class_id = fs.class_id
      JOIN fee_category fc ON fc.fee_category_id = fs.fee_cat_id
      ORDER BY fs.fee_struct_id
    `);
    return res.rows;
  },

  async createFeeStructure(data) {
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
        (class_id, section_id, fee_cat_id, amount, due_date, session_year)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [class_id, section_id ?? null, fee_cat_id, amount, due_date ?? null, session_year ?? null]
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

    const res = await pool.query(
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
    return res.rows[0];
  },

  async getStudentFeeCollection(studentId) {
    const res = await pool.query(
      `
      SELECT
        fc.*,
        fs.amount AS total_amount
      FROM fee_collection fc
      JOIN fee_structure fs ON fs.fee_struct_id = fc.fee_struct_id
      WHERE fc.student_id = $1
      `,
      [studentId]
    );
    return res.rows;
  }
};
