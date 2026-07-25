// src/controllers/fees_controller.js
import { FeesService } from "../services/fees_service.js";
import pool from "../config/db.js";

export const FeesController = {

  async getAllCategories(req, res) {
    try {
      const data = await FeesService.getAllCategories();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createCategory(req, res) {
    try {
      const { category_name } = req.body;
      if (!category_name || !category_name.trim()) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }
      const data = await FeesService.createCategory(req.body);
      res.status(201).json({ success: true, message: "Category created", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateCategory(req, res) {
    try {
      const data = await FeesService.updateCategory(req.params.id, req.body);
      res.json({ success: true, message: "Category updated", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteCategory(req, res) {
    try {
      await FeesService.deleteCategory(req.params.id);
      res.json({ success: true, message: "Category deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getFeeStructures(req, res) {
    try {
      const data = await FeesService.getFeeStructures(req.instituteId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createFeeStructure(req, res) {
    try {
      const { class_id, fee_cat_id, amount } = req.body;
      if (!class_id || !fee_cat_id || amount === undefined || amount === null) {
        return res.status(400).json({ success: false, message: "class_id, fee_cat_id, and amount are required" });
      }
      const data = await FeesService.createFeeStructure(req.body, req.instituteId);
      res.status(201).json({ success: true, message: "Fee structure created", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getInstallmentsByStructure(req, res) {
    try {
      const structCheck = await pool.query('SELECT institute_id FROM fee_structure WHERE fee_struct_id = $1', [Number(req.params.fee_struct_id)]);
      if (structCheck.rows.length === 0 || structCheck.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const data = await FeesService.getInstallmentsByStructure(req.params.fee_struct_id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async collectFee(req, res) {
    try {
      const { student_id, fee_struct_id, amount_paid } = req.body;
      if (!student_id || !fee_struct_id || !amount_paid || Number(amount_paid) <= 0) {
        return res.status(400).json({ success: false, message: "student_id, fee_struct_id, and a valid amount_paid (> 0) are required" });
      }

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
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
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
