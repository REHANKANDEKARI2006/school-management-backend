import { BloodGroupModel } from "../models/blood_group_Model.js";

export const BloodGroupController = {
  async getAll(req, res) {
    const data = await BloodGroupModel.getAll();
    res.json({ success: true, data });
  }
};
