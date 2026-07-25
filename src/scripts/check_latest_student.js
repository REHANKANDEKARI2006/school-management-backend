import db from '../../src/config/db.js';

async function checkLatestStudent() {
  const stu = await db.query(`
    SELECT 
      s.student_id, s.stu_first_name, s.stu_last_name, s.email as stu_email,
      u.user_id as student_user_id, u.email as student_user_email, u.invite_token, u.invite_token_expiry, u.status as u_status,
      g.guardian_user_id, gu.email as guardian_user_email, gu.invite_token as guardian_token
    FROM student s
    JOIN "user" u ON u.user_id = s.student_user_id
    LEFT JOIN guardian g ON g.student_id = s.student_id
    LEFT JOIN "user" gu ON gu.user_id = g.guardian_user_id
    ORDER BY s.student_id DESC
    LIMIT 3
  `);
  console.log('Latest 3 students in DB:', JSON.stringify(stu.rows, null, 2));
  process.exit(0);
}
checkLatestStudent();
