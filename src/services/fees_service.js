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

  async createFeeStructure(data) {
    const { class_id, fee_cat_id, amount } = data; // class_id here actually contains the STANDARD (e.g. "10") from the frontend form now.
    
    if (!class_id || !fee_cat_id || !amount) {
      throw new Error("class_id (standard), fee_cat_id and amount are required");
    }

    // 1. Fetch all classes
    const { ClassModel } = await import("../models/class_Model.js");
    const allClasses = await ClassModel.getAll();

    // 2. Filter classes that match the requested Standard (class_id carries the standard string)
    const matchingClasses = allClasses.filter(c => String(c.class_name).trim() === String(class_id).trim());

    if (matchingClasses.length === 0) {
      throw new Error(`No classes found for standard ${class_id}`);
    }

    // 3. Create fee structure for EVERY section in that standard
    const results = [];
    for (const cls of matchingClasses) {
      const payload = {
        ...data,
        class_id: cls.class_id,
        section_id: cls.section_id
      };
      
      const created = await FeesModel.createFeeStructure(payload);
      results.push(created);
    }

    // Return the first one or the array (depends on what frontend expects, usually success is enough)
    return results[0];
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
  },

  getFeeStatusByClass(classId) {
    return FeesModel.getFeeStatusByClass(classId);
  },

  getStudentDetailedFeeStatus(studentId) {
    return FeesModel.getStudentDetailedFeeStatus(studentId);
  },

  updateFeeStructure(standardName, feeCatId, newAmount) {
    return FeesModel.updateFeeStructure(standardName, feeCatId, newAmount);
  },

  deleteFeeStructure(standardName, feeCatId) {
    return FeesModel.deleteFeeStructure(standardName, feeCatId);
  }

};
