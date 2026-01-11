// controllers/materials_controller.js
import MaterialsService from "../services/materials_service.js";

export const MaterialsController = {

  async getAllMaterials(req, res) {
    const data = await MaterialsService.getAllMaterials();
    res.json({ success: true, data });
  },

  async getMaterial(req, res) {
    const data = await MaterialsService.getMaterialById(req.params.id);
    res.json({ success: true, data });
  },

  async addMaterial(req, res) {
    const material = await MaterialsService.addMaterial(req.body);
    res.json({
      success: true,
      message: "Material added successfully",
      data: material
    });
  },

  async updateMaterial(req, res) {
    const material = await MaterialsService.updateMaterial(
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      message: "Material updated successfully",
      data: material
    });
  },

  async deleteMaterial(req, res) {
    await MaterialsService.deleteMaterial(req.params.id);
    res.json({
      success: true,
      message: "Material deleted successfully"
    });
  },

  async uploadMaterialFile(req, res) {
    res.json({
      success: true,
      message: "File upload handled separately (Multer/S3)"
    });
  },

  async downloadMaterialFile(req, res) {
    res.json({
      success: true,
      message: "File download handled separately"
    });
  },

  async downloadMaterialFile(req, res) {
  try {
    const materialId = parseInt(req.params.id);

    const material = await MaterialsService.getMaterialById(materialId);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found"
      });
    }

    return res.download(material.file_path);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
};
