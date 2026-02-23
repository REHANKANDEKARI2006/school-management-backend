import { SectionModel } from "../models/section_Model.js";

export const SectionController = {

  async getAllSections(req, res) {
    try {
      const data = await SectionModel.getAll();
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error("❌ getAllSections error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to load sections",
      });
    }
  },

  async getByClass(req, res) {
    try {
      const data = await SectionModel.getByClass(req.params.classId);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error("❌ getByClass error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to load sections by class",
      });
    }
  },

};
