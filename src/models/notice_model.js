import pool from "../config/db.js";

export const NoticeModel = {

  getAllNotices() {
    return pool.query(
      `SELECT n.*, a.audience_name 
       FROM notices n
       LEFT JOIN notice_audience a ON n.audience_id = a.audience_id
       WHERE n.is_deleted = false 
       ORDER BY n.created_at DESC`
    );
  },

  getNoticeById(id) {
    return pool.query(
      `SELECT n.*, a.audience_name 
       FROM notices n
       LEFT JOIN notice_audience a ON n.audience_id = a.audience_id
       WHERE n.notice_id = $1 AND n.is_deleted = false`,
      [id]
    );
  },

  getNoticeAudiences() {
    return pool.query(
      "SELECT * FROM notice_audience ORDER BY audience_name ASC"
    );
  },

  createNotice(data) {
    const {
      title,
      content,
      author_name,
      author_type,
      author_id,
      audience_id,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `INSERT INTO notices
      (title, content, author_name, author_type, author_id, audience_id, img_url, attachment_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        title,
        content,
        author_name,
        author_type,
        author_id,
        audience_id,
        img_url,
        attachment_id
      ]
    );
  },

  updateNotice(id, data) {
    const {
      title,
      content,
      audience_id,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `UPDATE notices 
       SET title=$1, content=$2, audience_id=$3, img_url=$4, attachment_id=$5, updated_at=now()
       WHERE notice_id=$6
       RETURNING *`,
      [title, content, audience_id, img_url, attachment_id, id]
    );
  },

  softDeleteNotice(id) {
    return pool.query(
      `UPDATE notices 
       SET is_deleted = true 
       WHERE notice_id = $1`,
      [id]
    );
  }

};
