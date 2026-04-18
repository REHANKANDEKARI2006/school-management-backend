import { NoticeModel } from "../models/notice_model.js";

export const NoticeService = {

  async getAll(class_id = null) {
    const result = await NoticeModel.getAllNotices(class_id);
    return result.rows;
  },

  async getById(id) {
    const result = await NoticeModel.getNoticeById(id);
    return result.rows[0];
  },

  async getAudiences() {
    const result = await NoticeModel.getNoticeAudiences();
    return result.rows;
  },

  async create(data) {
    const result = await NoticeModel.createNotice(data);
    return result.rows[0];
  },

  async update(id, data) {
    const result = await NoticeModel.updateNotice(id, data);
    return result.rows[0];
  },

  async delete(id) {
    await NoticeModel.softDeleteNotice(id);
    return true;
  }

};
