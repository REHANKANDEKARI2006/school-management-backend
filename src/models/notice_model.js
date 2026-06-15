import pool from "../config/db.js";

export const NoticeModel = {

  getAllNotices(class_id = null, instituteId) {
    let query = `
      SELECT n.*, 
             CASE 
               WHEN a.audience_type = 'CLASS' AND a.audience_name ~ '^[0-9]+$' 
                 THEN 'Standard - ' || a.audience_name
               ELSE a.audience_name
             END AS audience_name,
             COALESCE(s.profile_url, adm.profile_url, madm.profile_url) as author_img
      FROM notices n
      LEFT JOIN notice_audience a ON n.audience_id = a.audience_id
      LEFT JOIN staff s ON n.author_id = s.staff_id AND n.author_type = 'Staff'
      LEFT JOIN admin adm ON n.author_id = adm.admin_id AND n.author_type = 'Institute Admin'
      LEFT JOIN master_admin madm ON n.author_id = madm.master_admin_id AND (n.author_type = 'Master Admin' OR n.author_type = 'Admin')
      WHERE n.is_deleted = false AND n.institute_id = $1
    `;
    
    const values = [instituteId];
    if (class_id) {
      // Student is querying notices: filter by class_id (direct match), class_ids (contains match), general audiences, or standard-level CLASS matching
      query += ` AND (
        n.class_id = $2 
        OR $2 = ANY(n.class_ids) 
        OR a.audience_type IN ('ALL_SCHOOL', 'ALL_STUDENTS')
        OR (a.audience_type = 'CLASS' AND a.audience_name = (SELECT class_name FROM class WHERE class_id = $2 AND institute_id = $1 LIMIT 1))
      ) `;
      values.push(class_id);
    }
    
    query += ` ORDER BY n.created_at DESC `;
    return pool.query(query, values);
  },

  getNoticeById(id, instituteId) {
    return pool.query(
      `SELECT n.*, 
              CASE 
                WHEN a.audience_type = 'CLASS' AND a.audience_name ~ '^[0-9]+$' 
                  THEN 'Standard - ' || a.audience_name
                ELSE a.audience_name
              END AS audience_name 
       FROM notices n
       LEFT JOIN notice_audience a ON n.audience_id = a.audience_id
       WHERE n.notice_id = $1 AND n.is_deleted = false AND n.institute_id = $2`,
      [id, instituteId]
    );
  },

  async getNoticeAudiences(instituteId) {
    // Dynamically ensure a CLASS-type audience entry exists for *every* standard
    // (distinct class_name) currently in the class table for this school.
    await pool.query(`
      INSERT INTO notice_audience
        (audience_type, class_id, section_id, department_id, audience_name)
      SELECT 'CLASS', NULL, NULL, NULL, s.class_name
      FROM (SELECT DISTINCT class_name FROM class WHERE class_name IS NOT NULL AND institute_id = $1) s
      WHERE NOT EXISTS (
        SELECT 1 FROM notice_audience na
        WHERE na.audience_type = 'CLASS'
          AND na.class_id IS NULL
          AND na.audience_name = s.class_name
      )
    `, [instituteId]);

    // Return non-CLASS entries + only the dynamic CLASS entries for this school,
    // ordered logically.
    return pool.query(`
      SELECT 
        audience_id,
        audience_type,
        class_id,
        section_id,
        department_id,
        CASE 
          WHEN audience_type = 'CLASS' AND audience_name ~ '^[0-9]+$' 
            THEN 'Standard - ' || audience_name
          ELSE audience_name
        END AS audience_name
      FROM notice_audience
      WHERE
        audience_type IN ('ALL_SCHOOL', 'ALL_STUDENTS', 'ALL_STAFF', 'DEPARTMENT')
        OR (audience_type = 'CLASS' AND class_id IS NULL AND audience_name IN (SELECT DISTINCT class_name FROM class WHERE institute_id = $1))
      ORDER BY
        CASE audience_type
          WHEN 'ALL_STUDENTS' THEN 1
          WHEN 'ALL_STAFF'    THEN 2
          WHEN 'ALL_SCHOOL'   THEN 3
          WHEN 'DEPARTMENT'   THEN 4
          WHEN 'CLASS'        THEN 5
          ELSE 6
        END,
        -- Numeric sort for standards: "Class 6" → '000006', "Class 10" → '000010'
        CASE
          WHEN audience_type = 'CLASS'
            THEN LPAD(
              COALESCE(NULLIF(REGEXP_REPLACE(audience_name, '[^0-9]', '', 'g'), ''), '999999'),
              6, '0'
            )
          ELSE audience_name
        END ASC
    `, [instituteId]);
  },

  createNotice(data, instituteId) {
    const {
      title,
      content,
      author_name,
      author_type,
      author_id,
      audience_id,
      class_id,
      class_ids,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `INSERT INTO notices
      (title, content, author_name, author_type, author_id, audience_id, class_id, class_ids, img_url, attachment_id, institute_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        title,
        content,
        author_name,
        author_type,
        author_id,
        audience_id,
        class_id,
        class_ids || [],
        img_url,
        attachment_id,
        instituteId
      ]
    );
  },

  updateNotice(id, data, instituteId) {
    const {
      title,
      content,
      audience_id,
      class_id,
      class_ids,
      img_url,
      attachment_id
    } = data;

    return pool.query(
      `UPDATE notices 
       SET title=$1, content=$2, audience_id=$3, class_id=$4, class_ids=$5, img_url=$6, attachment_id=$7, updated_at=now()
       WHERE notice_id=$8 AND institute_id=$9
       RETURNING *`,
      [
        title,
        content,
        audience_id,
        class_id,
        class_ids || [],
        img_url,
        attachment_id,
        id,
        instituteId
      ]
    );
  },

  softDeleteNotice(id, instituteId) {
    return pool.query(
      `DELETE FROM notices 
       WHERE notice_id = $1 AND institute_id = $2`,
      [id, instituteId]
    );
  }

};
