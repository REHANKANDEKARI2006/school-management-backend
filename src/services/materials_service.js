// services/materials_service.js
import MaterialsModel from "../models/materials_model.js";

const MaterialsService = {

  async addMaterial(data) {
    return await MaterialsModel.create(data);
  },

  async getAllMaterials() {
    return await MaterialsModel.findAll();
  },

  async getMaterialById(id) {
    return await MaterialsModel.findById(id);
  },

  async updateMaterial(id, data) {
    return await MaterialsModel.update(id, data);
  },

  async deleteMaterial(id) {
    return await MaterialsModel.delete(id);
  },

//     async getMaterialById(id) {
//     const result = await pool.query(
//       "SELECT * FROM materials WHERE material_id = $1",
//       [id]
//     );
//     return result.rows[0];
//   }
};

export default MaterialsService;
