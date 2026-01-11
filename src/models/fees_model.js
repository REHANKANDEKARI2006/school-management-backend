// src/models/fees_model.js
import pool from "../config/db.js";

export const FeesModel = {

  async getAllCategories() {
    const res = await pool.query(
      "SELECT * FROM fee_category WHERE is_active = true ORDER BY fee_category_id"
    );
    return res.rows;
  },

  async createCategory({ category_name, description }) {
    const res = await pool.query(
      `INSERT INTO fee_category (category_name, description)
       VALUES ($1, $2) RETURNING *`,
      [category_name, description]
    );
    return res.rows[0];
  },

  async updateCategory(id, { category_name, description, is_active }) {
    const res = await pool.query(
      `UPDATE fee_category
       SET category_name=$1, description=$2, is_active=$3, updated_at=now()
       WHERE fee_category_id=$4 RETURNING *`,
      [category_name, description, is_active, id]
    );
    return res.rows[0];
  },

  async deleteCategory(id) {
    await pool.query(
      "UPDATE fee_category SET is_active=false WHERE fee_category_id=$1",
      [id]
    );
  },

  async getFeeStructures() {
    const res = await pool.query(
      `SELECT * FROM fee_structure ORDER BY fee_struct_id`
    );
    return res.rows;
  },

  async createFeeStructure(data) {
    const {
      class_id, section_id, fee_cat_id,
      amount, due_date, session_year
    } = data;

    const res = await pool.query(
      `INSERT INTO fee_structure
      (class_id, section_id, fee_cat_id, amount, due_date, session_year)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [class_id, section_id, fee_cat_id, amount, due_date, session_year]
    );
    return res.rows[0];
  },

  async getInstallmentsByStructure(feeStructId) {
    const res = await pool.query(
      "SELECT * FROM fee_installment WHERE fee_struct_id=$1",
      [feeStructId]
    );
    return res.rows;
  },

  async collectFee(data) {
    const {
      student_id, fee_struct_id,
      amount_paid, payment_date,
      installment_no, receipt_no
    } = data;

    const res = await pool.query(
      `INSERT INTO fee_collection
      (student_id, fee_struct_id, amount_paid, payment_date, installment_no, receipt_no)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [student_id, fee_struct_id, amount_paid, payment_date, installment_no, receipt_no]
    );
    return res.rows[0];
  },

  async getStudentFeeCollection(studentId) {
    const res = await pool.query(
      `SELECT * FROM fee_collection WHERE student_id=$1`,
      [studentId]
    );
    return res.rows;
  }

};
