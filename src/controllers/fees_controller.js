// src/controllers/fees_controller.js
import { FeesService } from "../services/fees_service.js";

export const FeesController = {

  async getAllCategories(req, res) {
    const data = await FeesService.getAllCategories();
    res.json({ success: true, data });
  },

  async createCategory(req, res) {
    const data = await FeesService.createCategory(req.body);
    res.json({ success: true, message: "Category created", data });
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
    res.json({ success: true, message: "Fee structure created", data });
  },

  async getInstallmentsByStructure(req, res) {
    const data = await FeesService.getInstallmentsByStructure(req.params.fee_struct_id);
    res.json({ success: true, data });
  },

  async collectFee(req, res) {
    const data = await FeesService.collectFee(req.body);
    res.json({ success: true, message: "Fee collected", data });
  },

  async getStudentFeeCollection(req, res) {
    const data = await FeesService.getStudentFeeCollection(req.params.student_id);
    res.json({ success: true, data });
  }

};
