// services/materials_service.js
import MaterialsModel from "../models/materials_model.js";

const MaterialsService = {

  async addMaterial(data, instituteId) {
    return await MaterialsModel.create(data, instituteId);
  },

  async getAllMaterials(class_id = null, instituteId) {
    return await MaterialsModel.findAll(class_id, instituteId);
  },

  async getMaterialById(id, instituteId) {
    return await MaterialsModel.findById(id, instituteId);
  },

  async updateMaterial(id, data, instituteId) {
    return await MaterialsModel.update(id, data, instituteId);
  },

  async deleteMaterial(id, instituteId) {
    return await MaterialsModel.delete(id, instituteId);
  }
};

export default MaterialsService;
