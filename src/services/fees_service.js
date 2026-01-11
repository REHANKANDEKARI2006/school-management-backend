// src/services/fees_service.js
import { FeesModel } from "../models/fees_model.js";

export const FeesService = {

  getAllCategories() {
    return FeesModel.getAllCategories();
  },

  createCategory(data) {
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
    return FeesModel.createFeeStructure(data);
  },

  getInstallmentsByStructure(feeStructId) {
    return FeesModel.getInstallmentsByStructure(feeStructId);
  },

  collectFee(data) {
    return FeesModel.collectFee(data);
  },

  getStudentFeeCollection(studentId) {
    return FeesModel.getStudentFeeCollection(studentId);
  }

};
