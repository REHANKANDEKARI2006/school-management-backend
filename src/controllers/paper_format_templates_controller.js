// src/controllers/paper_format_templates_controller.js
import PaperFormatTemplatesModel from "../models/paper_format_templates_model.js";

const PaperFormatTemplatesController = {

  // GET /api/paper-format-templates?class_name=8&subject=Mathematics&exam_type=half_yearly
  async getTemplate(req, res) {
    try {
      const { class_name, subject, exam_type } = req.query;
      if (!class_name || !subject) {
        return res.status(400).json({ success: false, message: 'class_name and subject are required' });
      }
      const data = await PaperFormatTemplatesModel.getTemplate({ class_name, subject, exam_type }, req.instituteId);
      if (!data) return res.status(404).json({ success: false, message: 'No template found for this combination' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/paper-format-templates — list all (for admin)
  async listAll(req, res) {
    try {
      const data = await PaperFormatTemplatesModel.listAll(req.instituteId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/paper-format-templates/:id — get one by ID
  async getById(req, res) {
    try {
      const data = await PaperFormatTemplatesModel.getById(req.params.id, req.instituteId);
      if (!data) return res.status(404).json({ success: false, message: 'Template not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default PaperFormatTemplatesController;
