import { NotificationModel } from '../models/notification_Model.js';

export const NotificationController = {
  async getMyNotifications(req, res) {
    try {
      const data = await NotificationModel.getByUser(req.user.user_id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await NotificationModel.getUnreadCount(req.user.user_id);
      res.json({ success: true, count });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const data = await NotificationModel.markAsRead(id, req.user.user_id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async markAllAsRead(req, res) {
    try {
      await NotificationModel.markAllAsRead(req.user.user_id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};
