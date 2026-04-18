// src/controllers/fees_controller.js
import { FeesService } from "../services/fees_service.js";

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
    const data = await FeesService.getFeeStructures();
    res.json({ success: true, data });
  },

  async createFeeStructure(req, res) {
    const data = await FeesService.createFeeStructure(req.body);
    res.status(201).json({ success: true, message: "Fee structure created", data });
  },

  async getInstallmentsByStructure(req, res) {
    const data = await FeesService.getInstallmentsByStructure(req.params.fee_struct_id);
    res.json({ success: true, data });
  },

  async collectFee(req, res) {
    const data = await FeesService.collectFee(req.body);

    // Log activity
    try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
            req.user.user_id,
            'fee_collected',
            `Fee collected from Student ID: ${req.body.student_id}, Amount: ₹${req.body.amount_paid}`
        );
    } catch (e) { console.error(e); }

    res.status(201).json({ success: true, message: "Fee collected", data });
  },

  async getStudentFeeCollection(req, res) {
    const data = await FeesService.getStudentFeeCollection(req.params.student_id);
    res.json({ success: true, data });
  },

  async getFeeStatusByClass(req, res) {
    const data = await FeesService.getFeeStatusByClass(req.params.class_id);
    res.json({ success: true, data });
  },

  async getStudentDetailedFeeStatus(req, res) {
    const data = await FeesService.getStudentDetailedFeeStatus(req.params.student_id);
    res.json({ success: true, data });
  },

  async updateFeeStructure(req, res) {
    try {
      const { standardName, feeCatId, newAmount } = req.body;
      const data = await FeesService.updateFeeStructure(standardName, Number(feeCatId), Number(newAmount));
      res.json({ success: true, data });
    } catch (e) {
      console.error("Error in updateFeeStructure:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async deleteFeeStructure(req, res) {
    try {
      const { standardName, feeCatId } = req.query;
      const data = await FeesService.deleteFeeStructure(standardName, Number(feeCatId));
      res.json({ success: true, data });
    } catch (e) {
      console.error("Error in deleteFeeStructure:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
};
