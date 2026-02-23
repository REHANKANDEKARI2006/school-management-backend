// src/services/fees_service.js
import { FeesModel } from "../models/fees_model.js";

export const FeesService = {

  getAllCategories() {
    return FeesModel.getAllCategories();
  },

  createCategory(data) {
    if (!data.category_name) {
      throw new Error("Category name is required");
    }
    return FeesModel.createCategory(data);
  },

  updateCategory(id, data) {
    return FeesModel.updateCategory(id, data);
  },

  deleteCategory(id) {
    return FeesModel.deleteCategory(id);
  },

  getFeeStructures() {
    return FeesModel.getFeeStructures();
  },

  createFeeStructure(data) {
    const { class_id, fee_cat_id, amount } = data;
    if (!class_id || !fee_cat_id || !amount) {
      throw new Error("class_id, fee_cat_id and amount are required");
    }
    return FeesModel.createFeeStructure(data);
  },

  getInstallmentsByStructure(feeStructId) {
    return FeesModel.getInstallmentsByStructure(feeStructId);
  },

  collectFee(data) {
    const { student_id, fee_struct_id, amount_paid } = data;
    if (!student_id || !fee_struct_id || !amount_paid) {
      throw new Error("Missing fee collection data");
    }
    return FeesModel.collectFee(data);
  },

  getStudentFeeCollection(studentId) {
    return FeesModel.getStudentFeeCollection(studentId);
  }

};
