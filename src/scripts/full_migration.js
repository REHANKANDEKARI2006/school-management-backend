/**
 * COMPLETE DATABASE MIGRATION SCRIPT
 * ===================================
 * Creates ALL tables for the School Management System from scratch.
 * Tables are created in strict FK-dependency order.
 * 
 * Usage: node src/scripts/full_migration.js
 */

import db from '../config/db.js';

async function runFullMigration() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting FULL database migration...\n');

    // ══════════════════════════════════════════
    // TIER 0: Standalone lookup tables (no FKs)
    // ══════════════════════════════════════════

    console.log('📋 TIER 0: Creating standalone lookup tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS status (
        status_id SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL
      )
    `);
    console.log('  ✅ status');

    await client.query(`
      CREATE TABLE IF NOT EXISTS gender (
        gender_id SERIAL PRIMARY KEY,
        gender_name VARCHAR(20) NOT NULL
      )
    `);
    console.log('  ✅ gender');

    await client.query(`
      CREATE TABLE IF NOT EXISTS blood_group (
        bg_id SERIAL PRIMARY KEY,
        bg_name VARCHAR(10) NOT NULL
      )
    `);
    console.log('  ✅ blood_group');

    await client.query(`
      CREATE TABLE IF NOT EXISTS section (
        section_id SERIAL PRIMARY KEY,
        section_name VARCHAR(10) NOT NULL
      )
    `);
    console.log('  ✅ section');

    await client.query(`
      CREATE TABLE IF NOT EXISTS department (
        dept_id SERIAL PRIMARY KEY,
        dept_name VARCHAR(100) NOT NULL
      )
    `);
    console.log('  ✅ department');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_role (
        role_id      SERIAL PRIMARY KEY,
        role_code    VARCHAR(50)  UNIQUE NOT NULL,
        role_name    VARCHAR(100) NOT NULL,
        category     VARCHAR(50)  NOT NULL,
        description  TEXT
      )
    `);
    console.log('  ✅ user_role');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_status_id SERIAL PRIMARY KEY,
        status_name    VARCHAR(50) NOT NULL UNIQUE,
        description    TEXT,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ user_status');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_status (
        event_status_id   SERIAL PRIMARY KEY,
        event_status_name VARCHAR(50) NOT NULL UNIQUE,
        description       TEXT,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ event_status');

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_status (
        exam_status_id   SERIAL PRIMARY KEY,
        exam_status_name VARCHAR(50) NOT NULL UNIQUE,
        description      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ exam_status');

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_type (
        exam_type_id   SERIAL PRIMARY KEY,
        exam_type_code VARCHAR(50) UNIQUE NOT NULL,
        exam_type_name VARCHAR(100)      NOT NULL,
        category       VARCHAR(50)       NOT NULL,
        description    TEXT
      )
    `);
    console.log('  ✅ exam_type');

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_status (
        status_id   SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ attendance_status');

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_category (
        fee_category_id SERIAL PRIMARY KEY,
        category_name   VARCHAR(100) NOT NULL UNIQUE,
        description     TEXT,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ fee_category');

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_type_table (
        doc_type_id   INTEGER PRIMARY KEY,
        description   VARCHAR(255),
        template_path VARCHAR(255)
      )
    `);
    console.log('  ✅ document_type_table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_role_type (
        role_type_id SERIAL PRIMARY KEY,
        role_code    VARCHAR(50) UNIQUE NOT NULL,
        role_name    VARCHAR(100) NOT NULL
      )
    `);
    console.log('  ✅ event_role_type');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subject_type_table (
        subject_type_id SERIAL PRIMARY KEY,
        subject_type_name VARCHAR(100) NOT NULL
      )
    `);
    console.log('  ✅ subject_type_table');

    // ══════════════════════════════════════════
    // TIER 1: Tables with FK to TIER 0
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 1: Creating dependent tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS institute (
        institute_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        short_name VARCHAR(50),
        address VARCHAR(255),
        city VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50),
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(100),
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP,
        status_id INTEGER,
        CONSTRAINT institute_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.status(status_id)
      )
    `);
    console.log('  ✅ institute');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subject (
        subject_id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100),
        dept_id INTEGER,
        CONSTRAINT subject_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.department(dept_id)
      )
    `);
    console.log('  ✅ subject');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subject_type_mapping (
        mapping_id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subject(subject_id),
        subject_type_id INTEGER REFERENCES subject_type_table(subject_type_id),
        UNIQUE(subject_id, subject_type_id)
      )
    `);
    console.log('  ✅ subject_type_mapping');

    // ══════════════════════════════════════════
    // TIER 2: user table (depends on institute, user_role)
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 2: Creating user table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        user_id        SERIAL PRIMARY KEY,
        user_name      VARCHAR(100) UNIQUE NOT NULL,
        institute_id   INTEGER NOT NULL,
        email          VARCHAR(150) UNIQUE NOT NULL,
        phone          VARCHAR(20),
        password_hash  VARCHAR(255) NOT NULL,
        role_id        INTEGER,
        is_active      BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        email_token    VARCHAR(100),
        phone_verified BOOLEAN DEFAULT FALSE,
        phone_token    VARCHAR(100),
        invite_token   VARCHAR(255),
        invite_token_expiry TIMESTAMPTZ,
        created_by     INTEGER,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        last_login     TIMESTAMPTZ,
        CONSTRAINT user_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id),
        CONSTRAINT user_role_id_fkey
          FOREIGN KEY (role_id) REFERENCES public.user_role(role_id)
      )
    `);
    console.log('  ✅ user');

    // ══════════════════════════════════════════
    // TIER 3: Tables depending on user
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 3: Creating user-dependent tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS master_admin (
        master_admin_id    SERIAL PRIMARY KEY,
        user_id            INTEGER UNIQUE,
        m_admin_first_name VARCHAR(100),
        m_admin_last_name  VARCHAR(100),
        email              VARCHAR(255),
        phone              VARCHAR(20),
        gender_id          INTEGER,
        user_status_id     INTEGER NOT NULL,
        created_at         TIMESTAMPTZ DEFAULT now(),
        updated_at         TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT master_admin_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT master_admin_gender_id_fkey 
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT master_admin_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id)
      )
    `);
    console.log('  ✅ master_admin');

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        admin_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE,
        admin_first_name VARCHAR(100),
        admin_last_name  VARCHAR(100),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        gender_id        INTEGER,
        user_status_id   INTEGER NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT admin_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT admin_gender_id_fkey 
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT admin_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id)
      )
    `);
    console.log('  ✅ admin');

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE,
        role_id          INTEGER,
        staff_first_name VARCHAR(100),
        staff_last_name  VARCHAR(100),
        title            VARCHAR(50),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        qualification    TEXT,
        dept_id          INTEGER,
        subject_id       INTEGER,
        status_id        INTEGER,
        bg_id            INTEGER,
        gender_id        INTEGER,
        user_status_id   INTEGER,
        joining_date     DATE,
        profile_url      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT staff_bg_id_fkey
          FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id),
        CONSTRAINT staff_dept_id_fkey
          FOREIGN KEY (dept_id) REFERENCES public.department(dept_id),
        CONSTRAINT staff_gender_id_fkey
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT staff_status_id_fkey
          FOREIGN KEY (status_id) REFERENCES public.status(status_id),
        CONSTRAINT staff_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT staff_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT staff_role_id_fkey
          FOREIGN KEY (role_id) REFERENCES public.user_role(role_id)
      )
    `);
    console.log('  ✅ staff');

    await client.query(`
      CREATE TABLE IF NOT EXISTS student (
        student_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        stu_first_name VARCHAR(100),
        stu_middle_name VARCHAR(100),
        stu_last_name VARCHAR(100),
        email VARCHAR(150),
        status VARCHAR(50),
        address TEXT,
        date_of_birth DATE,
        bg_id INTEGER,
        joined_date DATE,
        gender_id INTEGER,
        profile_url TEXT,
        CONSTRAINT student_bg_id_fkey FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id),
        CONSTRAINT student_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('  ✅ student');

    await client.query(`
      CREATE TABLE IF NOT EXISTS guardian (
        guardian_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        student_id INTEGER,
        guardian_name VARCHAR(100),
        relation VARCHAR(50),
        phone VARCHAR(20),
        email VARCHAR(150),
        address TEXT,
        CONSTRAINT guardian_student_fkey FOREIGN KEY (student_id) REFERENCES student(student_id),
        CONSTRAINT guardian_user_fkey FOREIGN KEY (user_id) REFERENCES "user"(user_id)
      )
    `);
    console.log('  ✅ guardian');

    // ══════════════════════════════════════════
    // TIER 4: Tables depending on staff/student/class
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 4: Creating class and related tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS class (
        class_id    SERIAL PRIMARY KEY,
        class_name  VARCHAR(50),
        section_id  INTEGER,
        staff_id    INTEGER,
        room_number VARCHAR(10),
        institute_id INTEGER,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT class_section_id_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT class_staff_id_fkey
          FOREIGN KEY (staff_id)   REFERENCES public.staff(staff_id),
        CONSTRAINT class_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ class');

    await client.query(`
      CREATE TABLE IF NOT EXISTS class_section (
        class_section_id SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL,
        section_id       INTEGER NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT class_section_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT class_section_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id)
      )
    `);
    console.log('  ✅ class_section');

    await client.query(`
      CREATE TABLE IF NOT EXISTS class_enrollment (
        enrollment_id SERIAL PRIMARY KEY,
        class_id      INTEGER NOT NULL,
        student_id    INTEGER NOT NULL,
        enrolled_date TIMESTAMPTZ DEFAULT now(),
        status_id     INTEGER,
        institute_id  INTEGER,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT class_enrollment_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT class_enrollment_student_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT class_enrollment_status_fkey
          FOREIGN KEY (status_id) REFERENCES public.status(status_id),
        CONSTRAINT class_enrollment_institute_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ class_enrollment');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        schedule_id   SERIAL PRIMARY KEY,
        class_id      INTEGER NOT NULL,
        staff_id      INTEGER NOT NULL,
        subject_id    INTEGER NOT NULL,
        schedule_date DATE,
        day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_number SMALLINT NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        room_id       INTEGER,
        institute_id  INTEGER,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT schedule_class_fkey
          FOREIGN KEY (class_id)   REFERENCES public.class(class_id),
        CONSTRAINT schedule_staff_fkey
          FOREIGN KEY (staff_id)   REFERENCES public.staff(staff_id),
        CONSTRAINT schedule_subject_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT schedule_institute_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS schedule_class_slot_uk
        ON schedule (class_id, day_of_week, period_number);
    `);
    console.log('  ✅ schedule');

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_structure (
        fee_structure_id SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL REFERENCES class(class_id),
        fee_category_id  INTEGER NOT NULL REFERENCES fee_category(fee_category_id),
        amount           DECIMAL(10,2) NOT NULL,
        academic_year    VARCHAR(20),
        due_date         DATE,
        institute_id     INTEGER REFERENCES institute(institute_id),
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ fee_structure');

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_payment (
        payment_id      SERIAL PRIMARY KEY,
        student_id      INTEGER NOT NULL REFERENCES student(student_id),
        fee_structure_id INTEGER NOT NULL REFERENCES fee_structure(fee_structure_id),
        amount_paid     DECIMAL(10,2) NOT NULL,
        payment_date    DATE DEFAULT CURRENT_DATE,
        payment_method  VARCHAR(50),
        receipt_number  VARCHAR(100),
        remarks         TEXT,
        created_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ fee_payment');

    // ══════════════════════════════════════════
    // TIER 5: Attendance, Exams, Events, etc.
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 5: Creating module tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_session (
        session_id      SERIAL PRIMARY KEY,
        class_id        INTEGER NOT NULL,
        section_id      INTEGER NOT NULL,
        subject_id      INTEGER NOT NULL,
        faculty_id      INTEGER,
        attendance_date DATE NOT NULL,
        created_by      INTEGER,
        institute_id    INTEGER,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT attendance_session_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT attendance_session_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT attendance_session_subject_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT attendance_session_faculty_fkey
          FOREIGN KEY (faculty_id) REFERENCES public.staff(staff_id),
        CONSTRAINT attendance_session_institute_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ attendance_session');

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_record (
        record_id        SERIAL PRIMARY KEY,
        session_id       INTEGER NOT NULL,
        student_id       INTEGER NOT NULL,
        staff_id         INTEGER NOT NULL,
        status_id        INTEGER NOT NULL,
        timestamp        TIMESTAMPTZ DEFAULT now(),
        remarks          TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT attendance_record_session_fkey
          FOREIGN KEY (session_id) REFERENCES public.attendance_session(session_id) ON DELETE CASCADE,
        CONSTRAINT attendance_record_student_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT attendance_record_staff_fkey
          FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id),
        CONSTRAINT attendance_record_status_fkey
          FOREIGN KEY (status_id) REFERENCES public.attendance_status(status_id),
        UNIQUE(session_id, student_id)
      )
    `);
    console.log('  ✅ attendance_record');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id         SERIAL PRIMARY KEY,
        event_name       VARCHAR(100) NOT NULL,
        description      TEXT,
        event_date       DATE,
        venue            VARCHAR(150),
        event_status_id  INTEGER NOT NULL,
        event_type       VARCHAR(50) DEFAULT 'School Event',
        event_start_date DATE,
        event_end_date   DATE,
        start_time       TIME,
        end_time         TIME,
        displaced_period_action VARCHAR(20) DEFAULT 'cancel',
        institute_id     INTEGER,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT events_event_status_id_fkey
          FOREIGN KEY (event_status_id) REFERENCES public.event_status(event_status_id),
        CONSTRAINT events_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ events');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_role_assignment (
        assignment_id SERIAL PRIMARY KEY,
        event_id      INTEGER NOT NULL,
        role_type_id  INTEGER NOT NULL,
        user_id       INTEGER NOT NULL,
        remarks       VARCHAR(255),
        CONSTRAINT era_event_fkey
          FOREIGN KEY (event_id) REFERENCES events(event_id),
        CONSTRAINT era_role_type_fkey
          FOREIGN KEY (role_type_id) REFERENCES event_role_type(role_type_id),
        CONSTRAINT era_user_fkey
          FOREIGN KEY (user_id) REFERENCES "user"(user_id),
        CONSTRAINT era_unique
          UNIQUE (event_id, role_type_id, user_id)
      )
    `);
    console.log('  ✅ event_role_assignment');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_class_assignments (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        coordinator_teacher_id INTEGER REFERENCES staff(staff_id),
        attendance_status VARCHAR(20) DEFAULT 'not_started',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id)
      )
    `);
    console.log('  ✅ event_class_assignments');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_period_exchanges (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        original_period_number INTEGER NOT NULL,
        original_teacher_id INTEGER REFERENCES staff(staff_id),
        original_subject VARCHAR(100),
        exchange_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'exchanged',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ event_period_exchanges');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_attendance (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES student(student_id),
        status VARCHAR(10) NOT NULL DEFAULT 'present',
        remarks TEXT,
        marked_by INTEGER REFERENCES staff(staff_id),
        marked_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id, student_id)
      )
    `);
    console.log('  ✅ event_attendance');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_photos (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ event_photos');

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam (
        exam_id        SERIAL PRIMARY KEY,
        exam_name      VARCHAR(255) NOT NULL,
        exam_type_id   INTEGER NOT NULL,
        class_id       INTEGER NOT NULL,
        subject_id     INTEGER NOT NULL,
        date_time      TIMESTAMPTZ,
        duration_mins  INTEGER,
        total_score    DOUBLE PRECISION,
        min_marks      DOUBLE PRECISION,
        max_marks      DOUBLE PRECISION,
        exam_status_id INTEGER NOT NULL,
        marks_status   VARCHAR(50) DEFAULT 'Pending',
        institute_id   INTEGER,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT exam_exam_type_id_fkey
          FOREIGN KEY (exam_type_id) REFERENCES public.exam_type(exam_type_id),
        CONSTRAINT exam_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT exam_status_id_fkey
          FOREIGN KEY (exam_status_id) REFERENCES public.exam_status(exam_status_id),
        CONSTRAINT exam_class_id_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT exam_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ exam');

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_grades (
        grade_id        SERIAL PRIMARY KEY,
        exam_id         INTEGER NOT NULL,
        student_id      INTEGER NOT NULL,
        marks_obtained  DOUBLE PRECISION NOT NULL,
        grade           VARCHAR(10),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT exam_grades_exam_id_fkey
          FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE CASCADE,
        CONSTRAINT exam_grades_student_id_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE,
        CONSTRAINT exam_grades_exam_student_unique
          UNIQUE (exam_id, student_id)
      )
    `);
    console.log('  ✅ exam_grades');

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_results (
        result_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        exam_name VARCHAR(255) NOT NULL,
        total_obtained DOUBLE PRECISION NOT NULL,
        total_max DOUBLE PRECISION NOT NULL,
        percentage DOUBLE PRECISION NOT NULL,
        grade VARCHAR(10) NOT NULL,
        result_status VARCHAR(50) DEFAULT 'Generated',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (student_id, exam_name)
      )
    `);
    console.log('  ✅ student_results');

    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        material_id    SERIAL PRIMARY KEY,
        material_name  VARCHAR(150) NOT NULL,
        subject_id     INTEGER NOT NULL,
        class_id       INTEGER NOT NULL,
        file_path      VARCHAR(255) NOT NULL,
        upload_date    DATE NOT NULL,
        institute_id   INTEGER,
        updated_at     TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT materials_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT materials_class_id_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT materials_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ materials');

    // Notice system
    await client.query(`
      CREATE TABLE IF NOT EXISTS notice_audience (
        audience_id        SERIAL PRIMARY KEY,
        audience_type      VARCHAR(30) NOT NULL,
        class_id           INTEGER,
        section_id         INTEGER,
        department_id      INTEGER,
        audience_name      VARCHAR(150) NOT NULL,
        CONSTRAINT notice_audience_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT notice_audience_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT notice_audience_dept_fkey
          FOREIGN KEY (department_id) REFERENCES public.department(dept_id)
      )
    `);
    console.log('  ✅ notice_audience');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        notice_id     SERIAL PRIMARY KEY,
        title         VARCHAR(150) NOT NULL,
        content       TEXT NOT NULL,
        author_name   VARCHAR(100) NOT NULL,
        author_type   VARCHAR(30) NOT NULL,
        author_id     INTEGER,
        audience_id   INTEGER NOT NULL,
        img_url       VARCHAR(255),
        attachment_id INTEGER,
        post_date     DATE DEFAULT CURRENT_DATE,
        institute_id  INTEGER,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT notices_audience_fkey
          FOREIGN KEY (audience_id) REFERENCES public.notice_audience(audience_id),
        CONSTRAINT notices_institute_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id)
      )
    `);
    console.log('  ✅ notices');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notice_attachment (
        attachment_id SERIAL PRIMARY KEY,
        notice_id     INTEGER NOT NULL,
        file_url      VARCHAR(255) NOT NULL,
        file_type     VARCHAR(50),
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT notice_attachment_notice_fkey
          FOREIGN KEY (notice_id) REFERENCES public.notices(notice_id)
          ON DELETE CASCADE
      )
    `);
    console.log('  ✅ notice_attachment');

    // Grade boundaries
    await client.query(`
      CREATE TABLE IF NOT EXISTS grade_boundary (
        boundary_id   SERIAL PRIMARY KEY,
        class_group   VARCHAR(20) NOT NULL,
        grade_label   VARCHAR(10) NOT NULL,
        min_pct       DECIMAL(5,2) NOT NULL,
        max_pct       DECIMAL(5,2) NOT NULL,
        description   VARCHAR(100),
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ grade_boundary');

    // Document generation
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_generation (
        doc_id            SERIAL PRIMARY KEY,
        doc_type_id       INTEGER NOT NULL,
        generated_for_id  INTEGER NOT NULL,
        generated_for_type VARCHAR(20) NOT NULL,
        requested_by_id   INTEGER NOT NULL,
        file_path         VARCHAR(255),
        status            VARCHAR(30) DEFAULT 'generated',
        institute_id      INTEGER,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT document_generation_doc_type_id_fkey
          FOREIGN KEY (doc_type_id) REFERENCES public.document_type_table(doc_type_id)
      )
    `);
    console.log('  ✅ document_generation');

    // Promotion
    await client.query(`
      CREATE TABLE IF NOT EXISTS promotion (
        promotion_id           SERIAL PRIMARY KEY,
        student_id             INTEGER NOT NULL,
        from_class_section_id  INTEGER NOT NULL,
        to_class_section_id    INTEGER NOT NULL,
        action_type            VARCHAR(20) NOT NULL,
        reason                 VARCHAR(255),
        action_date            DATE NOT NULL DEFAULT CURRENT_DATE,
        performed_by           INTEGER,
        CONSTRAINT promotion_student_fkey
          FOREIGN KEY (student_id) REFERENCES student(student_id),
        CONSTRAINT promotion_from_cs_fkey
          FOREIGN KEY (from_class_section_id) REFERENCES class_section(class_section_id),
        CONSTRAINT promotion_to_cs_fkey
          FOREIGN KEY (to_class_section_id) REFERENCES class_section(class_section_id)
      )
    `);
    console.log('  ✅ promotion');

    // Holiday tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_holidays (
        id SERIAL PRIMARY KEY,
        holiday_name VARCHAR(100) NOT NULL,
        holiday_date DATE NOT NULL,
        category VARCHAR(50) CHECK (category IN ('National', 'School Holiday', 'Event')),
        description TEXT,
        created_by INTEGER,
        institute_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ custom_holidays');

    await client.query(`
      CREATE TABLE IF NOT EXISTS holiday_cache (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        holiday_data JSONB NOT NULL,
        source VARCHAR(50) NOT NULL,
        last_fetched_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(year, source)
      )
    `);
    console.log('  ✅ holiday_cache');

    // Question papers (redesigned)
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_papers (
        paper_id            SERIAL PRIMARY KEY,
        title               VARCHAR(255),
        class_name          VARCHAR(20)  NOT NULL,
        section             VARCHAR(10),
        subject             VARCHAR(100) NOT NULL,
        exam_type           VARCHAR(50),
        exam_date           DATE,
        total_marks         INTEGER      NOT NULL DEFAULT 80,
        duration_mins       INTEGER      NOT NULL DEFAULT 180,
        sections            JSONB        NOT NULL DEFAULT '[]',
        status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
        format_template_id  INTEGER,
        created_by          INTEGER,
        institute_id        INTEGER,
        inst_name           VARCHAR(255),
        inst_address        VARCHAR(500),
        created_at          TIMESTAMPTZ  DEFAULT now(),
        updated_at          TIMESTAMPTZ  DEFAULT now()
      )
    `);
    console.log('  ✅ question_papers');

    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_format_templates (
        template_id   SERIAL PRIMARY KEY,
        class_group   VARCHAR(20)  NOT NULL,
        subject       VARCHAR(100) NOT NULL,
        exam_type     VARCHAR(50),
        total_marks   INTEGER,
        duration_mins INTEGER,
        sections      JSONB        NOT NULL,
        institute_id  INTEGER,
        created_at    TIMESTAMPTZ  DEFAULT now(),
        updated_at    TIMESTAMPTZ  DEFAULT now(),
        UNIQUE (class_group, subject, exam_type)
      )
    `);
    console.log('  ✅ paper_format_templates');

    await client.query(`
      CREATE TABLE IF NOT EXISTS question_bank (
        question_id     SERIAL PRIMARY KEY,
        class_group     VARCHAR(20),
        class_specific  VARCHAR(10),
        subject         VARCHAR(100) NOT NULL,
        chapter         VARCHAR(200),
        question_type   VARCHAR(50)  NOT NULL,
        question_text   TEXT         NOT NULL,
        options         JSONB,
        answer          TEXT,
        difficulty      VARCHAR(10)  DEFAULT 'medium',
        marks           INTEGER      DEFAULT 1,
        tags            TEXT[]       DEFAULT '{}',
        added_by        INTEGER,
        institute_id    INTEGER,
        created_at      TIMESTAMPTZ  DEFAULT now()
      )
    `);
    console.log('  ✅ question_bank');

    // ══════════════════════════════════════════
    // TIER 6: Leave Management System
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 6: Creating leave management tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(60) UNIQUE NOT NULL,
        max_days_per_year INTEGER      NOT NULL DEFAULT 12,
        is_paid           BOOLEAN      NOT NULL DEFAULT true,
        requires_document BOOLEAN      NOT NULL DEFAULT false,
        created_at        TIMESTAMPTZ  DEFAULT now()
      )
    `);
    console.log('  ✅ leave_types');

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balance (
        id             SERIAL PRIMARY KEY,
        teacher_id     INTEGER       NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        leave_type_id  INTEGER       NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        academic_year  VARCHAR(9)    NOT NULL,
        total_days     DECIMAL(5,1)  NOT NULL DEFAULT 0,
        used_days      DECIMAL(5,1)  NOT NULL DEFAULT 0,
        remaining_days DECIMAL(5,1)  NOT NULL DEFAULT 0,
        updated_at     TIMESTAMPTZ   DEFAULT now(),
        UNIQUE(teacher_id, leave_type_id, academic_year)
      )
    `);
    console.log('  ✅ leave_balance');

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id                  SERIAL PRIMARY KEY,
        teacher_id          INTEGER       NOT NULL REFERENCES staff(staff_id),
        leave_type_id       INTEGER       NOT NULL REFERENCES leave_types(id),
        from_date           DATE          NOT NULL,
        to_date             DATE          NOT NULL,
        total_days          DECIMAL(5,1)  NOT NULL,
        reason              TEXT,
        document_url        TEXT,
        status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected','cancelled')),
        applied_at          TIMESTAMPTZ   DEFAULT now(),
        actioned_by_user_id INTEGER       REFERENCES "user"(user_id),
        actioned_at         TIMESTAMPTZ,
        admin_remarks       TEXT,
        institute_id        INTEGER REFERENCES institute(institute_id)
      )
    `);
    console.log('  ✅ leave_applications');

    await client.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id                    SERIAL PRIMARY KEY,
        leave_application_id  INTEGER     NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
        original_teacher_id   INTEGER     NOT NULL REFERENCES staff(staff_id),
        substitute_teacher_id INTEGER     NOT NULL REFERENCES staff(staff_id),
        assignment_date       DATE        NOT NULL,
        period_number         SMALLINT    NOT NULL,
        period_start_time     TIME        NOT NULL,
        period_end_time       TIME        NOT NULL,
        class_id              INTEGER     REFERENCES class(class_id),
        subject               VARCHAR(120),
        room                  VARCHAR(60),
        status                VARCHAR(25) NOT NULL DEFAULT 'pending_acceptance'
                              CHECK (status IN ('pending_acceptance','accepted','declined')),
        created_at            TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ substitute_assignments');

    // ══════════════════════════════════════════
    // TIER 7: Notifications
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 7: Creating notifications table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id  SERIAL PRIMARY KEY,
        user_id          INTEGER     NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        sender_user_id   INTEGER     REFERENCES "user"(user_id),
        related_leave_id INTEGER     REFERENCES leave_applications(id),
        title            VARCHAR(255) NOT NULL,
        message          TEXT        NOT NULL,
        type             VARCHAR(60),
        action_payload   JSONB,
        is_read          BOOLEAN     DEFAULT false,
        created_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ notifications');

    // ══════════════════════════════════════════
    // TIER 8: School Profile & Document Templates
    // ══════════════════════════════════════════

    console.log('\n📋 TIER 8: Creating remaining tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
        id SERIAL PRIMARY KEY,
        institute_id INTEGER NOT NULL REFERENCES institute(institute_id),
        school_name VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(150),
        website VARCHAR(255),
        logo_url TEXT,
        principal_name VARCHAR(100),
        affiliation_no VARCHAR(100),
        school_code VARCHAR(100),
        established_year INTEGER,
        motto TEXT,
        header_bg_color VARCHAR(20) DEFAULT '#1a237e',
        accent_color VARCHAR(20) DEFAULT '#ff6f00',
        watermark_opacity DECIMAL(3,2) DEFAULT 0.08,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(institute_id)
      )
    `);
    console.log('  ✅ school_profile');

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id SERIAL PRIMARY KEY,
        document_type VARCHAR(255) NOT NULL,
        language VARCHAR(50) NOT NULL DEFAULT 'english',
        content TEXT NOT NULL,
        character_limit INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_type, language)
      )
    `);
    console.log('  ✅ document_templates');

    // Teacher dashboard extras
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES staff(staff_id),
        recipient_id INTEGER NOT NULL REFERENCES staff(staff_id),
        subject VARCHAR(255),
        body TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ teacher_messages');

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_requests (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES staff(staff_id),
        request_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ teacher_requests');

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_submissions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(student_id),
        staff_id INTEGER NOT NULL REFERENCES staff(staff_id),
        title VARCHAR(255) NOT NULL,
        file_url TEXT,
        status VARCHAR(20) DEFAULT 'submitted',
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ student_submissions');

    // Activity log (from isolation migration)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(user_id),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        institute_id INTEGER REFERENCES institute(institute_id),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('  ✅ activity_log');

    await client.query('COMMIT');

    console.log('\n══════════════════════════════════════════');
    console.log('✅✅✅ ALL TABLES CREATED SUCCESSFULLY! ✅✅✅');
    console.log('══════════════════════════════════════════');
    console.log('\nNow seeding lookup data...\n');

    // ══════════════════════════════════════════
    // SEED LOOKUP DATA
    // ══════════════════════════════════════════

    // Gender
    await db.query(`
      INSERT INTO gender (gender_name) VALUES ('Male'), ('Female'), ('Other')
      ON CONFLICT DO NOTHING
    `);
    console.log('  🌱 gender seeded');

    // Blood groups
    await db.query(`
      INSERT INTO blood_group (bg_name) VALUES
        ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-')
      ON CONFLICT DO NOTHING
    `);
    console.log('  🌱 blood_group seeded');

    // Sections
    await db.query(`
      INSERT INTO section (section_name) VALUES ('A'), ('B'), ('C'), ('D')
      ON CONFLICT DO NOTHING
    `);
    console.log('  🌱 section seeded');

    // Status
    await db.query(`
      INSERT INTO status (status_name) VALUES
        ('Active'), ('Inactive'), ('Suspended'), ('On Leave'), ('Pending'),
        ('Completed'), ('Incomplete'), ('Rejected'), ('Approved'), ('Draft'),
        ('Cancelled'), ('Expelled'), ('Graduated'), ('On Duty'),
        ('Super Admin'), ('Scheduled'), ('Postponed'), ('In Progress'),
        ('Published'), ('Checked'), ('Unpublished')
      ON CONFLICT DO NOTHING
    `);
    console.log('  🌱 status seeded');

    // User status
    const userStatuses = [
      { name: 'Active', desc: 'User is currently active and has full access.' },
      { name: 'Inactive', desc: 'User account is temporarily disabled.' },
      { name: 'Suspended', desc: 'Student is suspended for disciplinary reasons.' },
      { name: 'Rusticated', desc: 'Student is permanently expelled.' },
      { name: 'Alumni', desc: 'Student has graduated/passed out.' },
      { name: 'Transferred', desc: 'Student has transferred to another school.' },
      { name: 'On Leave', desc: 'Staff is currently on approved leave.' },
      { name: 'Probation', desc: 'Staff is new and under probation period.' },
      { name: 'Resigned', desc: 'Staff has voluntarily left the job.' },
      { name: 'Terminated', desc: 'Staff employment has been terminated.' },
      { name: 'Retired', desc: 'Staff has retired from service.' },
      { name: 'Banned', desc: 'User is permanently banned from the system.' },
      { name: 'Pending Approval', desc: 'Account created, waiting for admin approval.' }
    ];
    for (const s of userStatuses) {
      await db.query(
        `INSERT INTO user_status (status_name, description)
         VALUES ($1, $2)
         ON CONFLICT (status_name) DO UPDATE SET description = EXCLUDED.description`,
        [s.name, s.desc]
      );
    }
    console.log('  🌱 user_status seeded');

    // User roles
    await db.query(`
      INSERT INTO user_role (role_code, role_name, category, description)
      VALUES
        ('MASTER_ADMIN',      'Master Administrator',        'System',     'Owner of the platform'),
        ('INSTITUTE_ADMIN',   'Institute Administrator',     'Admin',      'School-level admin'),
        ('TEACHER',           'Teacher',                     'Staff',      'Subject/grade teacher'),
        ('CLASS_TEACHER',     'Class Teacher',               'Staff',      'Teacher in charge of a class'),
        ('MENTOR',            'Mentor',                      'Staff',      'Teacher mentoring students'),
        ('LIBRARIAN',         'Librarian',                   'Staff',      'Manages library'),
        ('LAB_ASSISTANT',     'Lab Assistant',               'Staff',      'Supports labs'),
        ('SPORTS_MANAGER',    'Sports Manager',              'Staff',      'Manages sports'),
        ('COUNSELLOR',        'School Counsellor',           'Staff',      'Provides counselling'),
        ('PRINCIPAL',         'Principal',                   'Admin',      'Head of the school'),
        ('VICE_PRINCIPAL',    'Vice Principal',              'Admin',      'Assists principal'),
        ('OFFICE_STAFF',      'Office Staff',                'Staff',      'General admin duties'),
        ('CASHIER',           'Cashier',                     'Staff',      'Handles fee collection'),
        ('ACCOUNTANT',        'Accountant',                  'Staff',      'Manages accounts'),
        ('ADMISSION_OFFICER', 'Admission Officer',           'Staff',      'Handles admissions'),
        ('MANAGEMENT_MEMBER', 'Management Committee Member', 'Management', 'School management'),
        ('HR_MANAGER',        'HR Manager',                  'Management', 'Handles HR'),
        ('STUDENT',           'Student',                     'Student',    'Enrolled student'),
        ('CLASS_REPRESENTATIVE','Class Representative',      'Student',    'Class monitor'),
        ('GUARDIAN',          'Guardian / Parent',           'Guardian',   'Parent/guardian'),
        ('IT_SUPPORT',        'IT Support',                  'Support',    'Technical support'),
        ('LIBRARY_ASSISTANT', 'Library Assistant',           'Support',    'Assists librarian'),
        ('DEMO_USER',         'Demo Guest User',             'Demo',       'Guest demo user')
      ON CONFLICT (role_code) DO NOTHING
    `);
    console.log('  🌱 user_role seeded');

    // Event status
    const eventStatuses = [
      { name: 'Upcoming', desc: 'Event is planned for future date.' },
      { name: 'Scheduled', desc: 'Event has fixed date and time.' },
      { name: 'Ongoing', desc: 'Event is currently happening.' },
      { name: 'Completed', desc: 'Event has finished successfully.' },
      { name: 'Cancelled', desc: 'Event was cancelled.' }
    ];
    for (const s of eventStatuses) {
      await db.query(
        `INSERT INTO event_status (event_status_name, description) VALUES ($1, $2) ON CONFLICT (event_status_name) DO NOTHING`,
        [s.name, s.desc]
      );
    }
    console.log('  🌱 event_status seeded');

    // Exam status
    const examStatuses = [
      { name: 'Upcoming', desc: 'Exam is planned.' },
      { name: 'Scheduled', desc: 'Exam is fully scheduled.' },
      { name: 'Completed', desc: 'Exam has been conducted.' },
      { name: 'Cancelled', desc: 'Exam was cancelled.' }
    ];
    for (const s of examStatuses) {
      await db.query(
        `INSERT INTO exam_status (exam_status_name, description) VALUES ($1, $2) ON CONFLICT (exam_status_name) DO NOTHING`,
        [s.name, s.desc]
      );
    }
    console.log('  🌱 exam_status seeded');

    // Exam types
    await db.query(`
      INSERT INTO exam_type (exam_type_code, exam_type_name, category, description) VALUES
        ('WR_UNIT',  'Written Unit Test',    'Written',   'Regular written unit tests'),
        ('WR_TERM',  'Written Term Exam',    'Written',   'Mid-term written exam'),
        ('WR_FINAL', 'Written Final Exam',   'Written',   'Year-end written exam'),
        ('PR_UNIT',  'Practical Unit Test',  'Practical', 'Lab practical unit tests'),
        ('PR_TERM',  'Practical Term Exam',  'Practical', 'Mid-term practical exam'),
        ('PR_FINAL', 'Practical Final Exam', 'Practical', 'Year-end practical exam'),
        ('OR_UNIT',  'Oral Unit Test',       'Oral',      'Oral unit tests'),
        ('OR_TERM',  'Oral Term Exam',       'Oral',      'Mid-term oral exam'),
        ('OR_FINAL', 'Oral Final Exam',      'Oral',      'Year-end oral exam'),
        ('INTERNAL', 'Internal Assessment',  'Internal',  'Projects, assignments'),
        ('VIVA',     'Viva Voce',            'Oral',      'Detailed viva examination'),
        ('LAB_ONLY', 'Standalone Lab Exam',  'Practical', 'Only practical components')
      ON CONFLICT (exam_type_code) DO NOTHING
    `);
    console.log('  🌱 exam_type seeded');

    // Attendance status
    const attStatuses = [
      { id: 1, name: 'Present', desc: 'Student is present.' },
      { id: 2, name: 'Absent', desc: 'Student is absent.' },
      { id: 3, name: 'Late', desc: 'Student arrived late.' },
      { id: 4, name: 'Half Day', desc: 'Student attended half session.' },
      { id: 5, name: 'On Leave', desc: 'Student is on approved leave.' }
    ];
    for (const s of attStatuses) {
      await db.query(
        `INSERT INTO attendance_status (status_id, status_name, description)
         VALUES ($1, $2, $3) ON CONFLICT (status_id) DO NOTHING`,
        [s.id, s.name, s.desc]
      );
    }
    console.log('  🌱 attendance_status seeded');

    // Leave types
    await db.query(`
      INSERT INTO leave_types (name, max_days_per_year, is_paid, requires_document) VALUES
        ('Casual Leave',     12,  true,  false),
        ('Sick Leave',       10,  true,  false),
        ('Earned Leave',     15,  true,  false),
        ('Emergency Leave',   3,  true,  false),
        ('Half Day',          6,  true,  false),
        ('Loss of Pay',     999,  false, false)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('  🌱 leave_types seeded');

    console.log('\n══════════════════════════════════════════');
    console.log('🎉 FULL MIGRATION COMPLETED SUCCESSFULLY! 🎉');
    console.log('══════════════════════════════════════════');
    console.log('\nAll tables created and lookup data seeded.');
    console.log('The master admin will be auto-seeded on server startup.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ MIGRATION FAILED! Transaction rolled back.');
    console.error(err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runFullMigration();
