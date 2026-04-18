import pool from "../config/db.js";

export const NoticeModel = {

  getAllNotices(class_id = null) {
    let query = `
      SELECT n.*, a.audience_name,
             COALESCE(s.profile_url, adm.profile_url, madm.profile_url) as author_img
      FROM notices n
      LEFT JOIN notice_audience a ON n.audience_id = a.audience_id
      LEFT JOIN staff s ON n.author_id = s.staff_id AND n.author_type = 'Staff'
      LEFT JOIN admin adm ON n.author_id = adm.admin_id AND n.author_type = 'Institute Admin'
      LEFT JOIN master_admin madm ON n.author_id = madm.master_admin_id AND (n.author_type = 'Master Admin' OR n.author_type = 'Admin')
      WHERE n.is_deleted = false 
    `;
    
    const values = [];
    if (class_id) {
      // Assuming audience_id could be related to a specific class or we filter by class_id directly if it exists
      // For now, I'll assume there's a class_id column or it's general.
      // If it's a student, they should only see notices aimed at their class or 'General' (audience_id for all)
      query += ` AND (n.class_id = $1 OR n.audience_id = 1) `; // Assuming 1 is General/All
      values.push(class_id);
    }
    
    query += ` ORDER BY n.created_at DESC `;
    return pool.query(query, values);
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
      class_id,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `INSERT INTO notices
      (title, content, author_name, author_type, author_id, audience_id, class_id, img_url, attachment_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        title,
        content,
        author_name,
        author_type,
        author_id,
        audience_id,
        class_id,
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
      class_id,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `UPDATE notices 
       SET title=$1, content=$2, audience_id=$3, class_id=$4, img_url=$5, attachment_id=$6, updated_at=now()
       WHERE notice_id=$7
       RETURNING *`,
      [title, content, audience_id, class_id, img_url, attachment_id, id]
    );
  },

  softDeleteNotice(id) {
    return pool.query(
      `DELETE FROM notices 
       WHERE notice_id = $1`,
      [id]
    );
  }

};
