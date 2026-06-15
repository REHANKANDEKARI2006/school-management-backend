// src/controllers/fees_controller.js
import { FeesService } from "../services/fees_service.js";
import pool from "../config/db.js";

export const FeesController = {

  async getAllCategories(req, res) {
    const data = await FeesService.getAllCategories();
    res.json({ success: true, data });
  },

  async createCategory(req, res) {
    const data = await FeesService.createCategory(req.body);
    res.status(201).json({ success: true, message: "Category created", data });
  },

  async updateCategory(req, res) {
    const data = await FeesService.updateCategory(req.params.id, req.body);
    res.json({ success: true, message: "Category updated", data });
  },

  async deleteCategory(req, res) {
    await FeesService.deleteCategory(req.params.id);
    res.json({ success: true, message: "Category deleted" });
  },

  async getFeeStructures(req, res) {
    const data = await FeesService.getFeeStructures(req.instituteId);
    res.json({ success: true, data });
  },

  async createFeeStructure(req, res) {
    const data = await FeesService.createFeeStructure(req.body, req.instituteId);
    res.status(201).json({ success: true, message: "Fee structure created", data });
  },

  async getInstallmentsByStructure(req, res) {
    // Verify fee structure belongs to this school
    const structCheck = await pool.query('SELECT institute_id FROM fee_structure WHERE fee_struct_id = $1', [Number(req.params.fee_struct_id)]);
    if (structCheck.rows.length === 0 || structCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const data = await FeesService.getInstallmentsByStructure(req.params.fee_struct_id);
    res.json({ success: true, data });
  },

  async collectFee(req, res) {
    const { student_id, fee_struct_id } = req.body;
    
    // Verify student belongs to this school
    const studentCheck = await pool.query('SELECT u.institute_id FROM student s JOIN "user" u ON s.student_user_id = u.user_id WHERE s.student_id = $1', [Number(student_id)]);
    if (studentCheck.rows.length === 0 || studentCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Verify structure belongs to this school
    const structCheck = await pool.query('SELECT institute_id FROM fee_structure WHERE fee_struct_id = $1', [Number(fee_struct_id)]);
    if (structCheck.rows.length === 0 || structCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const data = await FeesService.collectFee(req.body);

    // Log activity
    try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
            req.user.user_id,
            'fee_collected',
            `Fee collected from Student ID: ${req.body.student_id}, Amount: ₹${req.body.amount_paid}`,
            req.instituteId
        );
    } catch (e) { console.error(e); }

    res.status(201).json({ success: true, message: "Fee collected", data });
  },

  async getStudentFeeCollection(req, res) {
    // Verify student belongs to this school
    const studentCheck = await pool.query('SELECT u.institute_id FROM student s JOIN "user" u ON s.student_user_id = u.user_id WHERE s.student_id = $1', [Number(req.params.student_id)]);
    if (studentCheck.rows.length === 0 || studentCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const data = await FeesService.getStudentFeeCollection(req.params.student_id);
    res.json({ success: true, data });
  },

  async getFeeStatusByClass(req, res) {
    // Verify class belongs to this school
    const classCheck = await pool.query('SELECT institute_id FROM class WHERE class_id = $1', [Number(req.params.class_id)]);
    if (classCheck.rows.length === 0 || classCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const data = await FeesService.getFeeStatusByClass(req.params.class_id);
    res.json({ success: true, data });
  },

  async getStudentDetailedFeeStatus(req, res) {
    // Verify student belongs to this school
    const studentCheck = await pool.query('SELECT u.institute_id FROM student s JOIN "user" u ON s.student_user_id = u.user_id WHERE s.student_id = $1', [Number(req.params.student_id)]);
    if (studentCheck.rows.length === 0 || studentCheck.rows[0].institute_id !== req.instituteId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const data = await FeesService.getStudentDetailedFeeStatus(req.params.student_id);
    res.json({ success: true, data });
  },

  async updateFeeStructure(req, res) {
    try {
      const { standardName, feeCatId, newAmount } = req.body;
      const data = await FeesService.updateFeeStructure(standardName, Number(feeCatId), Number(newAmount), req.instituteId);
      res.json({ success: true, data });
    } catch (e) {
      console.error("Error in updateFeeStructure:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async deleteFeeStructure(req, res) {
    try {
      const { standardName, feeCatId } = req.query;
      const data = await FeesService.deleteFeeStructure(standardName, Number(feeCatId), req.instituteId);
      res.json({ success: true, data });
    } catch (e) {
      console.error("Error in deleteFeeStructure:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
};
