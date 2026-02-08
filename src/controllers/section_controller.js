import { SectionModel } from "../models/section_Model.js";

export const SectionController = {
  async getByClass(req, res) {
    const data = await SectionModel.getByClass(req.params.classId);
    res.json({ success: true, data });
  }
};
