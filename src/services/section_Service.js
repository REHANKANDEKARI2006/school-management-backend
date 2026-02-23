import { SectionModel } from "../models/section_Model.js";

export const SectionService = {
  async getByClass(classId) {
    return await SectionModel.getByClass(classId);
  }
};
