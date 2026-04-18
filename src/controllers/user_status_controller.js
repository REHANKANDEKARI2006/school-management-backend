import { UserStatusModel } from "../models/user_status_Model.js";

export const UserStatusController = {
  async getAll(req, res) {
    try {
      const statuses = await UserStatusModel.getAll();
      return res.json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      console.error("Error fetching user statuses:", error);
      return res.status(500).json({
        success: false,
        message: "Server error fetching user statuses",
      });
    }
  },
};
