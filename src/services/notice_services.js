import { NoticeModel } from "../models/notice_model.js";

export const NoticeService = {

  async getAll(class_id = null, instituteId) {
    const result = await NoticeModel.getAllNotices(class_id, instituteId);
    return result.rows;
  },

  async getById(id, instituteId) {
    const result = await NoticeModel.getNoticeById(id, instituteId);
    return result.rows[0];
  },

  async getAudiences(instituteId) {
    const result = await NoticeModel.getNoticeAudiences(instituteId);
    return result.rows;
  },

  async create(data, instituteId) {
    const result = await NoticeModel.createNotice(data, instituteId);
    return result.rows[0];
  },

  async update(id, data, instituteId) {
    const result = await NoticeModel.updateNotice(id, data, instituteId);
    return result.rows[0];
  },

  async delete(id, instituteId) {
    await NoticeModel.softDeleteNotice(id, instituteId);
    return true;
  }

};
