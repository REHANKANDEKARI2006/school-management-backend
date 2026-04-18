import { NoticeService } from "../services/notice_services.js";

export const NoticeController = {

  async getAllNotices(req, res) {
    try {
      let { class_id } = req.query;
      const cleanClassId = class_id && !isNaN(parseInt(class_id)) ? parseInt(class_id) : null;
      const notices = await NoticeService.getAll(cleanClassId);
      res.json({ success: true, data: notices });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getNoticeById(req, res) {
    try {
      const notice = await NoticeService.getById(req.params.id);
      if (!notice) {
        return res.status(404).json({ success: false, message: "Notice not found" });
      }
      res.json({ success: true, data: notice });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getNoticeAudiences(req, res) {
    try {
      const audiences = await NoticeService.getAudiences();
      res.json({ success: true, data: audiences });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async createNotice(req, res) {
    try {
      const notice = await NoticeService.create(req.body);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user.user_id,
              'notice_posted',
              `New notice posted: ${req.body.title}`
          );
      } catch (e) { console.error(e); }

      res.status(201).json({
        success: true,
        message: "Notice created successfully",
        data: notice
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateNotice(req, res) {
    try {
      const notice = await NoticeService.update(req.params.id, req.body);
      res.json({
        success: true,
        message: "Notice updated successfully",
        data: notice
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteNotice(req, res) {
    try {
      await NoticeService.delete(req.params.id);
      res.json({
        success: true,
        message: "Notice removed from user view (Soft Delete)"
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

};
