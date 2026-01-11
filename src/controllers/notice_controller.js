import { NoticeService } from "../services/notice_services.js";

export const NoticeController = {

  async getAllNotices(req, res) {
    const notices = await NoticeService.getAll();
    res.json({ success: true, data: notices });
  },

  async getNoticeById(req, res) {
    const notice = await NoticeService.getById(req.params.id);
    res.json({ success: true, data: notice });
  },

  async createNotice(req, res) {
    const notice = await NoticeService.create(req.body);
    res.json({
      success: true,
      message: "Notice created successfully",
      data: notice
    });
  },

  async updateNotice(req, res) {
    const notice = await NoticeService.update(req.params.id, req.body);
    res.json({
      success: true,
      message: "Notice updated successfully",
      data: notice
    });
  },

  async deleteNotice(req, res) {
    await NoticeService.delete(req.params.id);
    res.json({
      success: true,
      message: "Notice removed from user view (Soft Delete)"
    });
  }

};
