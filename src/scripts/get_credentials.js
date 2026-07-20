import db from '../config/db.js';

async function getCredentials() {
  try {
    // 1. Find Class 2-C
    const classRes = await db.query(`
      SELECT c.class_id, c.class_name, sec.section_name, c.staff_id,
             st.staff_first_name, st.staff_last_name, st.email as staff_email,
             u.email as teacher_user_email
      FROM class c
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN staff st ON st.staff_id = c.staff_id
      LEFT JOIN "user" u ON u.user_id = st.user_id
      WHERE (c.class_name ILIKE '%2%' OR c.class_name ILIKE '%two%')
        AND (sec.section_name ILIKE 'C' OR c.class_name ILIKE '%C%')
    `);

    console.log('--- CLASSES MATCHING 2-C ---');
    console.table(classRes.rows);

    let classId = classRes.rows[0]?.class_id;

    if (!classId) {
      const allClassRes = await db.query(`
        SELECT c.class_id, c.class_name, sec.section_name 
        FROM class c
        LEFT JOIN section sec ON sec.section_id = c.section_id
        LIMIT 20
      `);
      console.log('--- ALL CLASSES AVAILABLE ---');
      console.table(allClassRes.rows);
      classId = allClassRes.rows[0]?.class_id;
    }

    // 2. Fetch Teacher for Class 2-C or any Teacher
    const teacherRes = await db.query(`
      SELECT st.staff_id, st.staff_first_name, st.staff_last_name, u.email as login_email, r.role_name
      FROM staff st
      JOIN "user" u ON u.user_id = st.user_id
      JOIN user_role r ON r.role_id = st.role_id
      WHERE st.staff_id = $1
    `, [classRes.rows[0]?.staff_id || 1]);

    console.log('--- TEACHER CREDENTIALS ---');
    console.table(teacherRes.rows);

    // Also get teacher1@demo.edu.in
    const teacher1Res = await db.query(`
      SELECT st.staff_id, st.staff_first_name, st.staff_last_name, u.email as login_email
      FROM staff st
      JOIN "user" u ON u.user_id = st.user_id
      LIMIT 5
    `);
    console.log('--- SAMPLE TEACHERS ---');
    console.table(teacher1Res.rows);

    // 3. Fetch Students in Class 2-C
    const classId2C = 6;
    const studentRes = await db.query(`
      SELECT s.student_id, s.stu_first_name, s.stu_last_name, u.email as login_email, c.class_name, sec.section_name
      FROM student s
      JOIN "user" u ON u.user_id = s.student_user_id
      JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE c.class_id = $1
      LIMIT 5
    `, [classId2C]);

    console.log('--- STUDENTS IN CLASS 2-C ---');
    console.table(studentRes.rows);

  } catch (err) {
    console.error('Error fetching credentials:', err);
  } finally {
    await db.end();
    process.exit(0);
  }
}

getCredentials();
