// controllers/materials_controller.js

export const MaterialsController = {

  // Get All Materials
  async getAllMaterials(req, res) {
    res.send("Get all materials");
  },

  // Get Single Material
  async getMaterial(req, res) {
    const materialId = parseInt(req.params.id);
    res.send(`Get material with ID: ${materialId}`);
  },

  // Add Material
  async addMaterial(req, res) {
    const { title, description, className, subject } = req.body;

    res.json({
      success: true,
      message: "Material added successfully",
      data: { title, description, className, subject }
    });
  },

  // Update Material
  async updateMaterial(req, res) {
    const materialId = parseInt(req.params.id);
    res.json({
      success: true,
      message: `Material updated with ID: ${materialId}`
    });
  },

  // Delete Material
  async deleteMaterial(req, res) {
    const materialId = parseInt(req.params.id);
    res.json({
      success: true,
      message: `Material deleted with ID: ${materialId}`
    });
  },

  // Upload Material File
  async uploadMaterialFile(req, res) {
    const { fileName } = req.body;

    res.json({
      success: true,
      message: "Material file uploaded successfully",
      fileName
    });
  },

  // Download Material File
  async downloadMaterialFile(req, res) {
    const fileId = parseInt(req.params.id);

    res.json({
      success: true,
      message: `Download file for ID: ${fileId}`
    });
  }

};
