import pool from "../config/db.js";

export const NoticeModel = {

  getAllNotices() {
    return pool.query(
      `SELECT * FROM notices 
       WHERE is_deleted = false 
       ORDER BY created_at DESC`
    );
  },

  getNoticeById(id) {
    return pool.query(
      `SELECT * FROM notices 
       WHERE notice_id = $1 AND is_deleted = false`,
      [id]
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
    const { title, content } = data;

    return pool.query(
      `UPDATE notices 
       SET title=$1, content=$2, updated_at=now()
       WHERE notice_id=$3
       RETURNING *`,
      [title, content, id]
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
