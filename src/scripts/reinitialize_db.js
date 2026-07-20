/**
 * REINITIALIZE DATABASE AND SEED ALL DATA
 * ========================================
 * Drops all existing tables and recreates them with correct column names
 * and FK constraints matching the latest code requirements.
 * Seeds all lookup data, master admin, admins, staff, classes, sections,
 * 600 students, guardians, schedules, fee categories, fee structures,
 * exams, events, notices, and leave balances dynamically.
 * 
 * Usage: node src/scripts/reinitialize_db.js
 */

import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Import name dictionaries for random student/guardian generator
import { nameDictionary } from '../migrations/nameDictionary.js';
import { addressDictionary } from '../migrations/addressDictionary.js';

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickCommunity() {
  const keys = Object.keys(nameDictionary);
  return nameDictionary[randItem(keys)];
}

function buildRandomAddress() {
  const street = randItem(addressDictionary.streets);
  const area   = randItem(addressDictionary.areas);
  const city   = randItem(addressDictionary.cities);
  const state  = randItem(addressDictionary.states);
  return `${street}, ${area}, ${city}, ${state}`;
}

async function run() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('🗑️ Dropping all existing tables CASCADE...');
    await client.query(`
      DROP TABLE IF EXISTS 
        activity_log, student_submissions, teacher_requests, teacher_messages, document_templates, school_profile, 
        notifications, substitute_assignments, leave_applications, leave_balance, leave_types, question_bank, 
        questions, paper_sections, template_custom_content, document_templates, generated_documents, paper_format_templates, question_papers, holiday_cache, custom_holidays, promotion, document_generation, 
        grade_boundary, notice_attachment, notices, notice_audience, materials, student_results, exam_grades, 
        exam, event_photos, event_attendance, event_period_exchanges, event_class_assignments, event_role_assignment, 
        events, attendance_record, attendance_session, fee_collection, fee_installment, fee_payment, fee_structure, schedule, class_enrollment, 
        class_section, class, guardian, student, staff, admin, master_admin, "user", subject_type_mapping, 
        subject, institute, subject_type_table, event_role_type, document_type_table, fee_category, 
        attendance_status, exam_type, exam_status, event_status, user_status, user_role, department, 
        section, blood_group, gender, status, login_attempts CASCADE;
    `);
    console.log('✅ Dropped all tables.');

    console.log('\n📋 Creating lookup and lookup-related tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        ip_address VARCHAR(50) PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 1,
        last_attempt TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS status (
        status_id SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS gender (
        gender_id SERIAL PRIMARY KEY,
        gender_name VARCHAR(20) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS blood_group (
        bg_id SERIAL PRIMARY KEY,
        bg_name VARCHAR(10) NOT NULL,
        blood_group VARCHAR(10)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS section (
        section_id SERIAL PRIMARY KEY,
        section_name VARCHAR(10) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS department (
        dept_id SERIAL PRIMARY KEY,
        dept_name VARCHAR(100) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_role (
        role_id      SERIAL PRIMARY KEY,
        role_code    VARCHAR(50)  UNIQUE NOT NULL,
        role_name    VARCHAR(100) NOT NULL,
        category     VARCHAR(50)  NOT NULL,
        description  TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_status_id SERIAL PRIMARY KEY,
        status_name    VARCHAR(50) NOT NULL UNIQUE,
        description    TEXT,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_status (
        event_status_id   SERIAL PRIMARY KEY,
        event_status_name VARCHAR(50) NOT NULL UNIQUE,
        description       TEXT,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_status (
        exam_status_id   SERIAL PRIMARY KEY,
        exam_status_name VARCHAR(50) NOT NULL UNIQUE,
        description      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_type (
        exam_type_id   SERIAL PRIMARY KEY,
        exam_type_code VARCHAR(50) UNIQUE NOT NULL,
        exam_type_name VARCHAR(100)      NOT NULL,
        category       VARCHAR(50)       NOT NULL,
        description    TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_status (
        status_id   SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_category (
        fee_category_id SERIAL PRIMARY KEY,
        category_name   VARCHAR(100) NOT NULL UNIQUE,
        description     TEXT,
        allow_installments BOOLEAN DEFAULT FALSE,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_type_table (
        doc_type_id   INTEGER PRIMARY KEY,
        description   VARCHAR(255),
        template_path VARCHAR(255)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_role_type (
        role_type_id SERIAL PRIMARY KEY,
        role_code    VARCHAR(50) UNIQUE NOT NULL,
        role_name    VARCHAR(100) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subject_type_table (
        subject_type_id SERIAL PRIMARY KEY,
        subject_type_name VARCHAR(100) NOT NULL
      )
    `);
    console.log('✅ Lookup tables created.');

    console.log('\n📋 Creating institute and subject tables...');
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
        status_id INTEGER REFERENCES status(status_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subject (
        subject_id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100),
        dept_id INTEGER REFERENCES department(dept_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subject_type_mapping (
        mapping_id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subject(subject_id) ON DELETE CASCADE,
        subject_type_id INTEGER REFERENCES subject_type_table(subject_type_id) ON DELETE CASCADE,
        UNIQUE(subject_id, subject_type_id)
      )
    `);
    console.log('✅ Institute and subject tables created.');

    console.log('\n📋 Creating user and core role tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        user_id        SERIAL PRIMARY KEY,
        user_name      VARCHAR(100) UNIQUE NOT NULL,
        institute_id   INTEGER NOT NULL REFERENCES institute(institute_id),
        email          VARCHAR(150) UNIQUE NOT NULL,
        phone          VARCHAR(20),
        password_hash  VARCHAR(255) NOT NULL,
        role_id        INTEGER REFERENCES user_role(role_id),
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
        status         VARCHAR(50) DEFAULT 'active'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS master_admin (
        master_admin_id    SERIAL PRIMARY KEY,
        user_id            INTEGER UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE,
        m_admin_first_name VARCHAR(100),
        m_admin_last_name  VARCHAR(100),
        email              VARCHAR(255),
        phone              VARCHAR(20),
        gender_id          INTEGER REFERENCES gender(gender_id),
        user_status_id     INTEGER NOT NULL REFERENCES user_status(user_status_id),
        profile_url        TEXT,
        bg_id              INTEGER REFERENCES blood_group(bg_id),
        created_at         TIMESTAMPTZ DEFAULT now(),
        updated_at         TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        admin_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE,
        admin_first_name VARCHAR(100),
        admin_last_name  VARCHAR(100),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        gender_id        INTEGER REFERENCES gender(gender_id),
        user_status_id   INTEGER NOT NULL REFERENCES user_status(user_status_id),
        profile_url      TEXT,
        bg_id            INTEGER REFERENCES blood_group(bg_id),
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE,
        role_id          INTEGER REFERENCES user_role(role_id),
        staff_first_name VARCHAR(100),
        staff_last_name  VARCHAR(100),
        title            VARCHAR(50),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        qualification    TEXT,
        dept_id          INTEGER REFERENCES department(dept_id),
        subject_id       INTEGER REFERENCES subject(subject_id),
        status_id        INTEGER REFERENCES status(status_id),
        bg_id            INTEGER REFERENCES blood_group(bg_id),
        gender_id        INTEGER REFERENCES gender(gender_id),
        user_status_id   INTEGER REFERENCES user_status(user_status_id),
        joining_date     DATE,
        profile_url      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student (
        student_id       SERIAL PRIMARY KEY,
        student_user_id  INTEGER UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE,
        stu_first_name   VARCHAR(100) NOT NULL,
        stu_middle_name  VARCHAR(100),
        stu_last_name    VARCHAR(100) NOT NULL,
        email            VARCHAR(150),
        address          TEXT,
        date_of_birth    DATE,
        gender_id        INTEGER REFERENCES gender(gender_id),
        bg_id            INTEGER REFERENCES blood_group(bg_id),
        joined_date      DATE,
        access_id        INTEGER,
        user_status_id   INTEGER NOT NULL REFERENCES user_status(user_status_id),
        profile_url      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        is_deleted       BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guardian (
        guardian_id      SERIAL PRIMARY KEY,
        guardian_user_id INTEGER UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE,
        grdn_first_name  VARCHAR(100) NOT NULL,
        grdn_last_name   VARCHAR(100) NOT NULL,
        student_id       INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        phone            VARCHAR(20),
        email            VARCHAR(150),
        address          TEXT,
        access_id        INTEGER,
        user_status_id   INTEGER NOT NULL REFERENCES user_status(user_status_id),
        gender_id        INTEGER REFERENCES gender(gender_id),
        profile_url      TEXT,
        bg_id            INTEGER REFERENCES blood_group(bg_id),
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ User and student/guardian tables created.');

    console.log('\n📋 Creating academic layout and related tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS class (
        class_id     SERIAL PRIMARY KEY,
        class_name   VARCHAR(50),
        section_id   INTEGER REFERENCES section(section_id),
        staff_id     INTEGER REFERENCES staff(staff_id),
        room_number  VARCHAR(10),
        institute_id INTEGER REFERENCES institute(institute_id),
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS class_section (
        class_section_id SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        section_id       INTEGER NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS class_enrollment (
        enrollment_id    SERIAL PRIMARY KEY,
        class_id         INTEGER REFERENCES class(class_id) ON DELETE CASCADE,
        class_section_id INTEGER REFERENCES class_section(class_section_id) ON DELETE CASCADE,
        student_id       INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        enrolled_date    TIMESTAMPTZ DEFAULT now(),
        enrolled_on      DATE DEFAULT CURRENT_DATE,
        status_id        INTEGER REFERENCES status(status_id),
        status           VARCHAR(50) DEFAULT 'Active',
        institute_id     INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        schedule_id   SERIAL PRIMARY KEY,
        class_id      INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        staff_id      INTEGER REFERENCES staff(staff_id) ON DELETE CASCADE,
        subject_id    INTEGER REFERENCES subject(subject_id) ON DELETE CASCADE,
        schedule_date DATE,
        day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_number SMALLINT NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        room_id       INTEGER,
        is_break      BOOLEAN DEFAULT FALSE,
        institute_id  INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS schedule_class_slot_uk ON schedule (class_id, day_of_week, period_number)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_structure (
        fee_struct_id    SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        section_id       INTEGER REFERENCES section(section_id),
        fee_cat_id       INTEGER NOT NULL REFERENCES fee_category(fee_category_id) ON DELETE CASCADE,
        amount           DECIMAL(10,2) NOT NULL,
        session_year     VARCHAR(20),
        due_date         DATE,
        institute_id     INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_collection (
        collection_id    SERIAL PRIMARY KEY,
        student_id       INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        fee_struct_id    INTEGER NOT NULL REFERENCES fee_structure(fee_struct_id) ON DELETE CASCADE,
        amount_paid      DECIMAL(10,2) NOT NULL,
        payment_date     DATE DEFAULT CURRENT_DATE,
        installment_no   INTEGER,
        receipt_no       VARCHAR(100),
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_installment (
        installment_id   SERIAL PRIMARY KEY,
        fee_struct_id    INTEGER NOT NULL REFERENCES fee_structure(fee_struct_id) ON DELETE CASCADE,
        installment_no   INTEGER NOT NULL,
        amount           DECIMAL(10,2) NOT NULL,
        due_date         DATE,
        created_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Academic layout and finance tables created.');

    console.log('\n📋 Creating attendance and events modules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_session (
        session_id      SERIAL PRIMARY KEY,
        class_id        INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        section_id      INTEGER NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
        subject_id      INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
        faculty_id      INTEGER REFERENCES staff(staff_id),
        attendance_date DATE NOT NULL,
        created_by      INTEGER,
        institute_id    INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_record (
        record_id        SERIAL PRIMARY KEY,
        session_id       INTEGER NOT NULL REFERENCES attendance_session(session_id) ON DELETE CASCADE,
        student_id       INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        staff_id         INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        status_id        INTEGER NOT NULL REFERENCES attendance_status(status_id),
        timestamp        TIMESTAMPTZ DEFAULT now(),
        remarks          TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        UNIQUE(session_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id         SERIAL PRIMARY KEY,
        event_name       VARCHAR(100) NOT NULL,
        description      TEXT,
        event_date       DATE,
        venue            VARCHAR(150),
        event_status_id  INTEGER NOT NULL REFERENCES event_status(event_status_id),
        event_type       VARCHAR(50) DEFAULT 'School Event',
        event_start_date DATE,
        event_end_date   DATE,
        start_time       TIME,
        end_time         TIME,
        displaced_period_action VARCHAR(20) DEFAULT 'cancel',
        institute_id     INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_role_assignment (
        assignment_id SERIAL PRIMARY KEY,
        event_id      INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        role_type_id  INTEGER NOT NULL REFERENCES event_role_type(role_type_id) ON DELETE CASCADE,
        user_id       INTEGER NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        remarks       VARCHAR(255),
        UNIQUE(event_id, role_type_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_class_assignments (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        coordinator_teacher_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        attendance_status VARCHAR(20) DEFAULT 'not_started',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_period_exchanges (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        original_period_number INTEGER NOT NULL,
        original_teacher_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        original_subject VARCHAR(100),
        exchange_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'exchanged',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_attendance (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        status VARCHAR(10) NOT NULL DEFAULT 'present',
        remarks TEXT,
        marked_by INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        marked_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_photos (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Attendance and events tables created.');

    // ── Additional tables for dashboard and timetable features ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        action_type    VARCHAR(20) NOT NULL,
        description    TEXT,
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id                      SERIAL PRIMARY KEY,
        class_id                INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        period_number           SMALLINT NOT NULL,
        assignment_date         DATE NOT NULL,
        original_teacher_id     INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        substitute_teacher_id   INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        subject_id              INTEGER REFERENCES subject(subject_id) ON DELETE SET NULL,
        status                  VARCHAR(20) DEFAULT 'pending',
        reason                  TEXT,
        created_at              TIMESTAMPTZ DEFAULT now(),
        updated_at              TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id             SERIAL PRIMARY KEY,
        teacher_id     INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        leave_type     VARCHAR(50),
        from_date      DATE NOT NULL,
        to_date        DATE NOT NULL,
        reason         TEXT,
        status         VARCHAR(20) DEFAULT 'pending',
        approved_by    INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
        id              INTEGER PRIMARY KEY,
        school_name     VARCHAR(200),
        email           VARCHAR(150),
        phone           VARCHAR(50),
        address         TEXT,
        academic_year   VARCHAR(20),
        logo_url        TEXT,
        principal_name  VARCHAR(100),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id                SERIAL PRIMARY KEY,
        template_name     VARCHAR(150) NOT NULL,
        document_type     VARCHAR(50) NOT NULL,
        base_template_id  VARCHAR(50) DEFAULT 'template1',
        title             TEXT,
        paragraph         TEXT,
        remarks           TEXT,
        content           TEXT,
        character_limit   INTEGER,
        language          VARCHAR(20) DEFAULT 'en',
        institute_id      INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_by        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        is_default        BOOLEAN DEFAULT FALSE,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS template_custom_content (
        id SERIAL PRIMARY KEY,
        document_type VARCHAR(50) NOT NULL,
        template_id VARCHAR(50) NOT NULL,
        language VARCHAR(20) NOT NULL,
        title TEXT,
        paragraph TEXT,
        remarks TEXT,
        institute_id INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(document_type, template_id, language, institute_id)
      )
    `);

    console.log('\n📋 Creating exams and grading module...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam (
        exam_id        SERIAL PRIMARY KEY,
        exam_name      VARCHAR(255) NOT NULL,
        exam_type_id   INTEGER NOT NULL REFERENCES exam_type(exam_type_id),
        class_id       INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        subject_id     INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
        date_time      TIMESTAMPTZ,
        duration_mins  INTEGER,
        total_score    DOUBLE PRECISION,
        min_marks      DOUBLE PRECISION,
        max_marks      DOUBLE PRECISION,
        exam_status_id INTEGER NOT NULL REFERENCES exam_status(exam_status_id),
        marks_status   VARCHAR(50) DEFAULT 'Pending',
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        is_deleted     BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_grades (
        grade_id        SERIAL PRIMARY KEY,
        exam_id         INTEGER NOT NULL REFERENCES exam(exam_id) ON DELETE CASCADE,
        student_id      INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        marks_obtained  DOUBLE PRECISION NOT NULL,
        grade           VARCHAR(10),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now(),
        UNIQUE(exam_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_results (
        result_id      SERIAL PRIMARY KEY,
        student_id     INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        class_id       INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        exam_name      VARCHAR(255) NOT NULL,
        total_obtained DOUBLE PRECISION NOT NULL,
        total_max      DOUBLE PRECISION NOT NULL,
        percentage     DOUBLE PRECISION NOT NULL,
        grade          VARCHAR(10) NOT NULL,
        result_status  VARCHAR(50) DEFAULT 'Generated',
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        UNIQUE(student_id, exam_name)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        material_id    SERIAL PRIMARY KEY,
        material_name  VARCHAR(150) NOT NULL,
        subject_id     INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
        class_id       INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        file_path      VARCHAR(255) NOT NULL,
        upload_date    DATE NOT NULL,
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Exams and grading tables created.');

    console.log('\n📋 Creating notices and document generator...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notice_audience (
        audience_id        SERIAL PRIMARY KEY,
        audience_type      VARCHAR(30) NOT NULL,
        class_id           INTEGER REFERENCES class(class_id) ON DELETE SET NULL,
        section_id         INTEGER REFERENCES section(section_id) ON DELETE SET NULL,
        department_id      INTEGER REFERENCES department(dept_id) ON DELETE SET NULL,
        audience_name      VARCHAR(150) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        notice_id     SERIAL PRIMARY KEY,
        title         VARCHAR(150) NOT NULL,
        content       TEXT NOT NULL,
        author_name   VARCHAR(100) NOT NULL,
        author_type   VARCHAR(30) NOT NULL,
        author_id     INTEGER,
        audience_id   INTEGER NOT NULL REFERENCES notice_audience(audience_id) ON DELETE CASCADE,
        img_url       VARCHAR(255),
        attachment_id INTEGER,
        post_date     DATE DEFAULT CURRENT_DATE,
        institute_id  INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),
        is_deleted    BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notice_attachment (
        attachment_id SERIAL PRIMARY KEY,
        notice_id     INTEGER NOT NULL REFERENCES notices(notice_id) ON DELETE CASCADE,
        file_url      VARCHAR(255) NOT NULL,
        file_type     VARCHAR(50),
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now()
      )
    `);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_generation (
        doc_id            SERIAL PRIMARY KEY,
        doc_type_id       INTEGER NOT NULL REFERENCES document_type_table(doc_type_id),
        generated_for_id  INTEGER NOT NULL,
        generated_for_type VARCHAR(20) NOT NULL,
        requested_by_id   INTEGER NOT NULL,
        file_path         VARCHAR(255),
        status            VARCHAR(30) DEFAULT 'generated',
        institute_id      INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS promotion (
        promotion_id           SERIAL PRIMARY KEY,
        student_id             INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        from_class_section_id  INTEGER NOT NULL REFERENCES class_section(class_section_id) ON DELETE CASCADE,
        to_class_section_id    INTEGER NOT NULL REFERENCES class_section(class_section_id) ON DELETE CASCADE,
        action_type            VARCHAR(20) NOT NULL,
        reason                 VARCHAR(255),
        action_date            DATE NOT NULL DEFAULT CURRENT_DATE,
        performed_by           INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_holidays (
        id           SERIAL PRIMARY KEY,
        holiday_name VARCHAR(100) NOT NULL,
        holiday_date DATE NOT NULL,
        category     VARCHAR(50) CHECK (category IN ('National', 'School Holiday', 'Event')),
        description  TEXT,
        created_by   INTEGER,
        institute_id INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS holiday_cache (
        id              SERIAL PRIMARY KEY,
        year            INTEGER NOT NULL,
        holiday_data    JSONB NOT NULL,
        source          VARCHAR(50) NOT NULL,
        last_fetched_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(year, source)
      )
    `);
    console.log('✅ Notices and document creation tables built.');

    console.log('\n📋 Creating custom question paper builders...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_papers (
        paper_id            SERIAL PRIMARY KEY,
        exam_id             INTEGER REFERENCES exam(exam_id) ON DELETE SET NULL,
        title               VARCHAR(255),
        class_id            INTEGER REFERENCES class(class_id) ON DELETE SET NULL,
        subject_id          INTEGER REFERENCES subject(subject_id) ON DELETE SET NULL,
        class_name          VARCHAR(20),
        section             VARCHAR(10),
        subject             VARCHAR(100),
        exam_type           VARCHAR(50),
        exam_date           DATE,
        total_marks         INTEGER      NOT NULL DEFAULT 80,
        duration_mins       INTEGER      NOT NULL DEFAULT 180,
        instructions        TEXT,
        sections            JSONB        NOT NULL DEFAULT '[]',
        status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
        is_template         BOOLEAN      DEFAULT FALSE,
        format_template_id  INTEGER,
        created_by          INTEGER,
        institute_id        INTEGER      REFERENCES institute(institute_id) ON DELETE CASCADE,
        inst_name           VARCHAR(255),
        inst_address        VARCHAR(500),
        created_at          TIMESTAMPTZ  DEFAULT now(),
        updated_at          TIMESTAMPTZ  DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_sections (
        section_id    SERIAL PRIMARY KEY,
        paper_id      INTEGER NOT NULL REFERENCES question_papers(paper_id) ON DELETE CASCADE,
        title         VARCHAR(255),
        instructions  TEXT,
        section_order INTEGER DEFAULT 1,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        question_id   SERIAL PRIMARY KEY,
        section_id    INTEGER NOT NULL REFERENCES paper_sections(section_id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'subjective',
        marks         DOUBLE PRECISION DEFAULT 1,
        options       JSONB DEFAULT '[]',
        question_order INTEGER DEFAULT 1,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_format_templates (
        template_id   SERIAL PRIMARY KEY,
        class_group   VARCHAR(20)  NOT NULL,
        subject       VARCHAR(100) NOT NULL,
        exam_type     VARCHAR(50),
        total_marks   INTEGER,
        duration_mins INTEGER,
        sections      JSONB        NOT NULL,
        instructions  JSONB        DEFAULT '[]',
        labels        JSONB        DEFAULT '{}',
        class_name    VARCHAR(50),
        institute_id  INTEGER,
        created_at    TIMESTAMPTZ  DEFAULT now(),
        updated_at    TIMESTAMPTZ  DEFAULT now(),
        UNIQUE (class_group, subject, exam_type)
      )
    `);

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
    console.log('✅ Question paper builder tables built.');

    console.log('\n📋 Creating leave modules and notifications...');
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id                  SERIAL PRIMARY KEY,
        teacher_id          INTEGER       NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        leave_type_id       INTEGER       NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
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
        institute_id        INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id                    SERIAL PRIMARY KEY,
        leave_application_id  INTEGER     NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
        original_teacher_id   INTEGER     NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        substitute_teacher_id INTEGER     NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        assignment_date       DATE        NOT NULL,
        period_number         SMALLINT    NOT NULL,
        period_start_time     TIME        NOT NULL,
        period_end_time       TIME        NOT NULL,
        class_id              INTEGER     REFERENCES class(class_id) ON DELETE SET NULL,
        subject               VARCHAR(120),
        room                  VARCHAR(60),
        status                VARCHAR(25) NOT NULL DEFAULT 'pending_acceptance'
                              CHECK (status IN ('pending_acceptance','accepted','declined')),
        created_at            TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id  SERIAL PRIMARY KEY,
        user_id          INTEGER     NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        sender_user_id   INTEGER     REFERENCES "user"(user_id) ON DELETE SET NULL,
        related_leave_id INTEGER     REFERENCES leave_applications(id) ON DELETE SET NULL,
        title            VARCHAR(255) NOT NULL,
        message          TEXT        NOT NULL,
        type             VARCHAR(60),
        action_payload   JSONB,
        is_read          BOOLEAN     DEFAULT false,
        created_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Leave system and notifications tables built.');

    console.log('\n📋 Creating profile and teacher dashboard helper tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
        id SERIAL PRIMARY KEY,
        institute_id INTEGER NOT NULL REFERENCES institute(institute_id) ON DELETE CASCADE,
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        subject VARCHAR(255),
        body TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_requests (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        request_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_submissions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        staff_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_url TEXT,
        status VARCHAR(20) DEFAULT 'submitted',
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        institute_id INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Profile and helper tables built.');

    // ══════════════════════════════════════════
    // SEED REFERENCE DATA
    // ══════════════════════════════════════════
    console.log('\n🌱 Seeding reference and lookup data...');

    await client.query("INSERT INTO gender (gender_name) VALUES ('Male'), ('Female'), ('Other')");
    await client.query("INSERT INTO blood_group (bg_name) VALUES ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-')");
    await client.query("INSERT INTO section (section_name) VALUES ('A'), ('B'), ('C'), ('D')");
    
    await client.query(`
      INSERT INTO status (status_name) VALUES
        ('Active'), ('Inactive'), ('Suspended'), ('On Leave'), ('Pending'),
        ('Completed'), ('Incomplete'), ('Rejected'), ('Approved'), ('Draft'),
        ('Cancelled'), ('Expelled'), ('Graduated'), ('On Duty'),
        ('Super Admin'), ('Scheduled'), ('Postponed'), ('In Progress'),
        ('Published'), ('Checked'), ('Unpublished')
    `);

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
      await client.query(
        `INSERT INTO user_status (status_name, description) VALUES ($1, $2)`,
        [s.name, s.desc]
      );
    }

    await client.query(`
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
    `);

    await client.query(`
      INSERT INTO event_status (event_status_name, description) VALUES
        ('Upcoming', 'Event is planned for future date.'),
        ('Scheduled', 'Event has fixed date and time.'),
        ('Ongoing', 'Event is currently happening.'),
        ('Completed', 'Event has finished successfully.'),
        ('Cancelled', 'Event was cancelled.')
    `);

    await client.query(`
      INSERT INTO exam_status (exam_status_name, description) VALUES
        ('Upcoming', 'Exam is planned.'),
        ('Scheduled', 'Exam is fully scheduled.'),
        ('Completed', 'Exam has been conducted.'),
        ('Cancelled', 'Exam was cancelled.')
    `);

    await client.query(`
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
    `);

    await client.query(`
      INSERT INTO attendance_status (status_id, status_name, description) VALUES
        (1, 'Present', 'Student is present.'),
        (2, 'Absent', 'Student is absent.'),
        (3, 'Late', 'Student arrived late.'),
        (4, 'Half Day', 'Student attended half session.'),
        (5, 'On Leave', 'Student is on approved leave.')
    `);

    await client.query(`
      INSERT INTO leave_types (name, max_days_per_year, is_paid, requires_document) VALUES
        ('Casual Leave',     12,  true,  false),
        ('Sick Leave',       10,  true,  false),
        ('Earned Leave',     15,  true,  false),
        ('Emergency Leave',   3,  true,  false),
        ('Half Day',          6,  true,  false),
        ('Loss of Pay',     999,  false, false)
    `);

    await client.query(`
      INSERT INTO document_type_table (doc_type_id, description, template_path) VALUES
        (1, 'Bonafide Certificate',    'templates/bonafide.docx'),
        (2, 'Leaving Certificate',     'templates/leaving_certificate.docx'),
        (3, 'Student Result Sheet',    'templates/result_sheet.docx'),
        (4, 'Question Paper',          'templates/question_paper.docx'),
        (5, 'General Notice',          'templates/notice.docx'),
        (6, 'Admission Advertisement', 'templates/advertisement.docx'),
        (7, 'Fee Receipt',             'templates/fee_receipt.docx'),
        (8, 'ID Card Template',        'templates/id_card.docx'),
        (9, 'Transfer Certificate',    'templates/transfer_certificate.docx')
    `);

    await client.query(`
      INSERT INTO event_role_type (role_code, role_name) VALUES
        ('COORDINATOR', 'Coordinator'),
        ('VOLUNTEER', 'Volunteer'),
        ('SPEAKER', 'Speaker'),
        ('JUDGE', 'Judge')
    `);

    await client.query(`
      INSERT INTO subject_type_table (subject_type_name) VALUES
        ('Core'), ('Elective'), ('Practical'), ('Language'), ('Extra-curricular')
    `);

    console.log('✅ Seeded reference tables.');

    // ══════════════════════════════════════════
    // SEED INSTITUTES
    // ══════════════════════════════════════════
    console.log('\n🏢 Seeding institutes...');
    await client.query(`
      INSERT INTO institute
        (institute_id, name, short_name, address, city, state, country, postal_code, phone, email, website, logo_url, updated_at, status_id)
      VALUES
        (1, 'Happy Valley College', 'HVC', '123 Main Road, Sector 7', 'Mumbai', 'Maharashtra', 'India', '400001', '022-12345678', 'info@happyvalley.edu.in', 'https://happyvalley.edu.in', 'https://happyvalley.edu.in/logo.png', NOW(), 1),
        (2, 'Blue Ridge Academy', 'BRA', 'Plot 5, Blue Ridge Lane', 'Bangalore', 'Karnataka', 'India', '560001', '080-66554477', 'admin@blueridge.edu.in', 'https://blueridge.edu.in', 'https://blueridge.edu.in/logo.png', NOW(), 1),
        (3, 'Sunshine Public School', 'SPS', '88 Sunshine St.', 'Pune', 'Maharashtra', 'India', '411001', '020-33445566', 'contact@sunshineps.edu.in', 'https://sunshineps.edu.in', 'https://sunshineps.edu.in/logo.png', NOW(), 1)
    `);
    console.log('✅ Seeded institutes.');

    // ══════════════════════════════════════════
    // SEED DEPARTMENTS & SUBJECTS
    // ══════════════════════════════════════════
    console.log('\n📚 Seeding departments and subjects...');
    await client.query(`
      INSERT INTO department (dept_id, dept_name) VALUES
        (1, 'Language'), (2, 'Mathematics'), (3, 'Science'), (4, 'Social Science'), 
        (5, 'History'), (6, 'Geography'), (7, 'Physical Education & Sports'), 
        (8, 'Computer Science'), (9, 'Accounts & Finance'), (10, 'Library'), 
        (11, 'Art & Craft'), (12, 'Music')
    `);

    await client.query(`
      INSERT INTO subject (subject_id, subject_name, dept_id) VALUES
        (1, 'English', 1), (2, 'Hindi', 1), (3, 'Urdu', 1), (4, 'Marathi', 1),
        (5, 'Mathematics 1', 2), (6, 'Mathematics 2', 2), (7, 'Science 1', 3), (8, 'Science 2', 3),
        (9, 'Social Science', 4), (10, 'Ancient History', 5), (11, 'Modern History', 5),
        (12, 'Physical Geography', 6), (13, 'Human Geography', 6), (14, 'Physical Education', 7),
        (15, 'Sports', 7), (16, 'Basic Computers', 8), (17, 'Computer Applications', 8),
        (18, 'Accounts', 9), (19, 'Finance', 9), (20, 'Library Science', 10),
        (21, 'Fine Arts', 11), (22, 'Craft', 11), (23, 'Vocal Music', 12), (24, 'Instrumental Music', 12)
    `);
    console.log('✅ Seeded departments and subjects.');

    // ══════════════════════════════════════════
    // SEED USERS & STAFF
    // ══════════════════════════════════════════
    console.log('\n👥 Seeding users and staff...');
    const hashedPwd = await bcrypt.hash('password123', 10);
    const mockHash = hashedPwd;

    // Seeding Master Admin
    const activeStatusIdRes = await client.query("SELECT user_status_id FROM user_status WHERE status_name = 'Active'");
    const activeStatusId = activeStatusIdRes.rows[0].user_status_id;

    const masterAdminRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'MASTER_ADMIN'");
    const masterAdminRoleId = masterAdminRoleIdRes.rows[0].role_id;

    // Users
    await client.query(`
      INSERT INTO "user" (user_id, user_name, institute_id, email, password_hash, role_id, is_active, status) VALUES
        (1, 'masteradmin1', 3, 'masteradmin1@demo.edu.in', '${hashedPwd}', ${masterAdminRoleId}, true, 'active'),
        (2, 'masteradmin2', 3, 'masteradmin2@demo.edu.in', '${hashedPwd}', ${masterAdminRoleId}, true, 'active')
    `);

    await client.query(`
      INSERT INTO master_admin (user_id, m_admin_first_name, m_admin_last_name, email, phone, gender_id, user_status_id) VALUES
        (1, 'Karim', 'Shaikh', 'masteradmin1@demo.edu.in', '9000000001', 1, ${activeStatusId}),
        (2, 'Ravi', 'Prasad', 'masteradmin2@demo.edu.in', '9000000002', 1, ${activeStatusId})
    `);

    // Admins (Institute Admin)
    const instAdminRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'INSTITUTE_ADMIN'");
    const instAdminRoleId = instAdminRoleIdRes.rows[0].role_id;

    await client.query(`
      INSERT INTO "user" (user_id, user_name, institute_id, email, password_hash, role_id, is_active, status) VALUES
        (3, 'admin.rahul', 3, 'rahul.admin@demo.edu.in', '${hashedPwd}', ${instAdminRoleId}, true, 'active'),
        (4, 'admin.rita', 3, 'rita.admin@demo.edu.in', '${hashedPwd}', ${instAdminRoleId}, true, 'active'),
        (5, 'admin.jay', 3, 'jay.admin@demo.edu.in', '${hashedPwd}', ${instAdminRoleId}, true, 'active')
    `);

    await client.query(`
      INSERT INTO admin (user_id, admin_first_name, admin_last_name, email, contact, gender_id, user_status_id) VALUES
        (3, 'Rahul', 'Sharma', 'rahul.admin@demo.edu.in', '9000000010', 1, ${activeStatusId}),
        (4, 'Rita', 'Patel', 'rita.admin@demo.edu.in', '9000000011', 2, ${activeStatusId}),
        (5, 'Jay', 'Singh', 'jay.admin@demo.edu.in', '9000000012', 1, ${activeStatusId})
    `);

    // Staff Users: 30 Teachers (user_id 6..35), 2 Cashiers (36..37), 1 Librarian (38), 4 Management (39..42), 3 Sports (43..45)
    const teacherRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'TEACHER'");
    const teacherRoleId = teacherRoleIdRes.rows[0].role_id;

    const cashierRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'CASHIER'");
    const cashierRoleId = cashierRoleIdRes.rows[0].role_id;

    const librarianRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'LIBRARIAN'");
    const librarianRoleId = librarianRoleIdRes.rows[0].role_id;

    const managementRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'MANAGEMENT_MEMBER'");
    const managementRoleId = managementRoleIdRes.rows[0].role_id;

    const sportsMgrRoleIdRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'SPORTS_MANAGER'");
    const sportsMgrRoleId = sportsMgrRoleIdRes.rows[0].role_id;

    // Batch insert users
    const staffUsers = [];
    // 30 Teachers
    for (let i = 1; i <= 30; i++) {
      staffUsers.push(`(100+${i}, 'teacher${i}', 3, 'teacher${i}@demo.edu.in', '${mockHash}', ${teacherRoleId}, true, 'active')`);
    }
    // 2 Cashiers
    for (let i = 1; i <= 2; i++) {
      staffUsers.push(`(140+${i}, 'cashier${i}', 3, 'cashier${i}@demo.edu.in', '${mockHash}', ${cashierRoleId}, true, 'active')`);
    }
    // 1 Librarian
    staffUsers.push(`(150, 'librarian', 3, 'librarian@demo.edu.in', '${mockHash}', ${librarianRoleId}, true, 'active')`);
    // 4 Management
    staffUsers.push(`(160, 'management', 3, 'management@demo.edu.in', '${mockHash}', ${managementRoleId}, true, 'active')`);
    staffUsers.push(`(161, 'office.staff1', 3, 'office.staff1@demo.edu.in', '${mockHash}', ${managementRoleId}, true, 'active')`);
    staffUsers.push(`(162, 'office.staff2', 3, 'office.staff2@demo.edu.in', '${mockHash}', ${managementRoleId}, true, 'active')`);
    staffUsers.push(`(163, 'hr.manager', 3, 'hr.manager@demo.edu.in', '${mockHash}', ${managementRoleId}, true, 'active')`);
    // 3 Sports
    staffUsers.push(`(170, 'sportsmgr', 3, 'sportsmgr@demo.edu.in', '${mockHash}', ${sportsMgrRoleId}, true, 'active')`);
    staffUsers.push(`(171, 'sports.asst1', 3, 'sports.asst1@demo.edu.in', '${mockHash}', ${sportsMgrRoleId}, true, 'active')`);
    staffUsers.push(`(172, 'sports.asst2', 3, 'sports.asst2@demo.edu.in', '${mockHash}', ${sportsMgrRoleId}, true, 'active')`);

    await client.query(`
      INSERT INTO "user" (user_id, user_name, institute_id, email, password_hash, role_id, is_active, status) VALUES
        ${staffUsers.join(',\n')}
    `);

    // Staff Table seeding
    await client.query(`
      INSERT INTO staff (
        staff_id, user_id, role_id, staff_first_name, staff_last_name, title, email, contact, qualification,
        dept_id, subject_id, status_id, bg_id, gender_id, user_status_id, joining_date
      ) VALUES
        (1, 101, ${teacherRoleId}, 'Anwar', 'Shaikh', 'Teacher', 'teacher1@demo.edu.in', '9100000001', 'MSc Mathematics', 2, 5, 1, 1, 1, ${activeStatusId}, '2023-06-10'),
        (2, 102, ${teacherRoleId}, 'Ayesha', 'Shaikh', 'Teacher', 'teacher2@demo.edu.in', '9100000002', 'MA English', 1, 1, 1, 2, 2, ${activeStatusId}, '2023-06-10'),
        (3, 103, ${teacherRoleId}, 'Ramsha', 'Khan', 'Teacher', 'teacher3@demo.edu.in', '9100000003', 'MSc Science', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-06-10'),
        (4, 104, ${teacherRoleId}, 'Pooja', 'Sharma', 'Teacher', 'teacher4@demo.edu.in', '9100000004', 'MA Hindi', 1, 2, 1, 2, 2, ${activeStatusId}, '2023-06-10'),
        (5, 105, ${teacherRoleId}, 'Mohit', 'Kumar', 'Teacher', 'teacher5@demo.edu.in', '9100000005', 'MSc Physics', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-06-10'),
        (6, 106, ${teacherRoleId}, 'Simran', 'Patel', 'Teacher', 'teacher6@demo.edu.in', '9100000006', 'MSc Comp. Sci.', 8, 16, 1, 2, 2, ${activeStatusId}, '2023-06-10'),
        (7, 107, ${teacherRoleId}, 'Ramesh', 'Yadav', 'Teacher', 'teacher7@demo.edu.in', '9100000007', 'MSc Biology', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-06-10'),
        (8, 108, ${teacherRoleId}, 'Priya', 'Jain', 'Teacher', 'teacher8@demo.edu.in', '9100000008', 'MA Geography', 6, 12, 1, 2, 2, ${activeStatusId}, '2023-06-10'),
        (9, 109, ${teacherRoleId}, 'Vinay', 'Nair', 'Teacher', 'teacher9@demo.edu.in', '9100000009', 'MA History', 5, 10, 1, 1, 1, ${activeStatusId}, '2023-06-10'),
        (10, 110, ${teacherRoleId}, 'Deepa', 'Gupta', 'Teacher', 'teacher10@demo.edu.in', '9100000010', 'MA Social Sci.', 4, 9, 1, 2, 2, ${activeStatusId}, '2023-06-10'),
        (11, 111, ${teacherRoleId}, 'Kamyar', 'Ali', 'Teacher', 'teacher11@demo.edu.in', '9100000011', 'MSc Chemistry', 3, 7, 1, 1, 2, ${activeStatusId}, '2023-07-01'),
        (12, 112, ${teacherRoleId}, 'Lata', 'Iyer', 'Teacher', 'teacher12@demo.edu.in', '9100000012', 'MSc Physics', 3, 7, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (13, 113, ${teacherRoleId}, 'Suhas', 'Patel', 'Teacher', 'teacher13@demo.edu.in', '9100000013', 'MA Economics', 4, 9, 1, 1, 1, ${activeStatusId}, '2023-07-01'),
        (14, 114, ${teacherRoleId}, 'Neha', 'Rao', 'Teacher', 'teacher14@demo.edu.in', '9100000014', 'MA Political Sci.', 4, 9, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (15, 115, ${teacherRoleId}, 'Arjun', 'Chopra', 'Teacher', 'teacher15@demo.edu.in', '9100000015', 'MSc Biology', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-07-01'),
        (16, 116, ${teacherRoleId}, 'Shruti', 'Mishra', 'Teacher', 'teacher16@demo.edu.in', '9100000016', 'MSc Computer Sci.', 8, 16, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (17, 117, ${teacherRoleId}, 'Harish', 'Bose', 'Teacher', 'teacher17@demo.edu.in', '9100000017', 'MA English', 1, 1, 1, 1, 1, ${activeStatusId}, '2023-07-01'),
        (18, 118, ${teacherRoleId}, 'Sarah', 'Khan', 'Teacher', 'teacher18@demo.edu.in', '9100000018', 'MSc Mathematics', 2, 5, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (19, 119, ${teacherRoleId}, 'Zobia', 'Mobeen', 'Teacher', 'teacher19@demo.edu.in', '9100000019', 'MSc Physics', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-07-01'),
        (20, 120, ${teacherRoleId}, 'Alina', 'Fernandes', 'Teacher', 'teacher20@demo.edu.in', '9100000020', 'MA Geography', 6, 12, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (21, 121, ${teacherRoleId}, 'Rekha', 'Pillai', 'Teacher', 'teacher21@demo.edu.in', '9100000021', 'MA Hindi', 1, 2, 1, 2, 2, ${activeStatusId}, '2023-08-01'),
        (22, 122, ${teacherRoleId}, 'Mukesh', 'Chawla', 'Teacher', 'teacher22@demo.edu.in', '9100000022', 'MA History', 5, 10, 1, 1, 1, ${activeStatusId}, '2023-08-01'),
        (23, 123, ${teacherRoleId}, 'Namra', 'Baig', 'Teacher', 'teacher23@demo.edu.in', '9100000023', 'MA Civics', 4, 9, 1, 2, 2, ${activeStatusId}, '2023-08-01'),
        (24, 124, ${teacherRoleId}, 'Rohit', 'Bhatia', 'Teacher', 'teacher24@demo.edu.in', '9100000024', 'MSc Chemistry', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-08-01'),
        (25, 125, ${teacherRoleId}, 'Anita', 'Thakur', 'Teacher', 'teacher25@demo.edu.in', '9100000025', 'MSc Biology', 3, 7, 1, 2, 2, ${activeStatusId}, '2023-08-01'),
        (26, 126, ${teacherRoleId}, 'Nikhil', 'Pandey', 'Teacher', 'teacher26@demo.edu.in', '9100000026', 'MSc Mathematics', 2, 5, 1, 1, 1, ${activeStatusId}, '2023-09-01'),
        (27, 127, ${teacherRoleId}, 'Garima', 'Kotwal', 'Teacher', 'teacher27@demo.edu.in', '9100000027', 'MA English', 1, 1, 1, 2, 2, ${activeStatusId}, '2023-09-01'),
        (28, 128, ${teacherRoleId}, 'Imran', 'Qureshi', 'Teacher', 'teacher28@demo.edu.in', '9100000028', 'MSc Physics', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-09-01'),
        (29, 129, ${teacherRoleId}, 'Rina', 'Gadre', 'Teacher', 'teacher29@demo.edu.in', '9100000029', 'MA Geography', 6, 12, 1, 2, 2, ${activeStatusId}, '2023-09-01'),
        (30, 130, ${teacherRoleId}, 'Sandeep', 'Rawat', 'Teacher', 'teacher30@demo.edu.in', '9100000030', 'MSc Biology', 3, 7, 1, 1, 1, ${activeStatusId}, '2023-09-01'),
        (31, 141, ${cashierRoleId}, 'Alok', 'Shah', 'Cashier', 'cashier1@demo.edu.in', '9200000001', 'BCom Finance', 9, NULL, 1, 1, 1, ${activeStatusId}, '2023-07-01'),
        (32, 142, ${cashierRoleId}, 'Kareem', 'Mulla', 'Cashier', 'cashier2@demo.edu.in', '9200000002', 'BCom Accounts', 9, NULL, 1, 2, 2, ${activeStatusId}, '2023-07-01'),
        (33, 150, ${librarianRoleId}, 'Meena', 'Kaur', 'Librarian', 'librarian@demo.edu.in', '9300000001', 'MLISc', 10, NULL, 1, 2, 2, ${activeStatusId}, '2022-06-15'),
        (34, 160, ${managementRoleId}, 'Sanjay', 'Mehta', 'Management', 'management@demo.edu.in', '9400000001', 'MBA', NULL, NULL, 1, 1, 1, ${activeStatusId}, '2021-04-01'),
        (35, 161, ${managementRoleId}, 'Leena', 'Rathi', 'Office Staff', 'office.staff1@demo.edu.in', '9400000002', 'BBA', NULL, NULL, 1, 2, 2, ${activeStatusId}, '2023-03-15'),
        (36, 162, ${managementRoleId}, 'Amit', 'Salunke', 'Office Staff', 'office.staff2@demo.edu.in', '9400000003', 'BCom', NULL, NULL, 1, 1, 1, ${activeStatusId}, '2023-03-15'),
        (37, 163, ${managementRoleId}, 'Ravi', 'Kapoor', 'HR Manager', 'hr.manager@demo.edu.in', '9400000004', 'MBA HR', NULL, NULL, 1, 1, 1, ${activeStatusId}, '2023-02-01'),
        (38, 170, ${sportsMgrRoleId}, 'Anil', 'Raj', 'Sports Manager', 'sportsmgr@demo.edu.in', '9500000001', 'BPEd', 7, NULL, 1, 1, 1, ${activeStatusId}, '2022-01-10'),
        (39, 171, ${sportsMgrRoleId}, 'Prakash', 'More', 'PE Assistant', 'sports.asst1@demo.edu.in', '9500000002', 'BPEd', 7, NULL, 1, 1, 1, ${activeStatusId}, '2023-04-01'),
        (40, 172, ${sportsMgrRoleId}, 'Sarika', 'Menon', 'PE Assistant', 'sports.asst2@demo.edu.in', '9500000003', 'BPEd', 7, NULL, 1, 2, 2, ${activeStatusId}, '2023-04-01')
    `);
    console.log('✅ Seeded staff and staff users.');

    // ══════════════════════════════════════════
    // SEED CLASSES & CLASS SECTIONS
    // ══════════════════════════════════════════
    console.log('\n🏫 Seeding classes and sections...');
    // Seed classes Class 1 to Class 10 (A, B, C)
    const classes = [];
    let room = 100;
    for (let c = 1; c <= 10; c++) {
      for (let s = 1; s <= 3; s++) {
        // Mapped to teachers 1..30 dynamically
        const teacherId = ((c - 1) * 3 + s) % 30 + 1;
        classes.push(`('Class ${c}', ${s}, ${teacherId}, '${room++}', 3, now(), now())`);
      }
    }
    await client.query(`
      INSERT INTO class (class_name, section_id, staff_id, room_number, institute_id, created_at, updated_at) VALUES
        ${classes.join(',\n')}
    `);

    // Fetch class IDs to populate class_section
    const { rows: newlyCreatedClasses } = await client.query("SELECT class_id, section_id FROM class ORDER BY class_id");
    const classSections = [];
    for (const cls of newlyCreatedClasses) {
      classSections.push(`(${cls.class_id}, ${cls.section_id})`);
    }
    await client.query(`
      INSERT INTO class_section (class_id, section_id) VALUES
        ${classSections.join(',\n')}
    `);
    console.log('✅ Seeded classes and class_section records.');

    // ══════════════════════════════════════════
    // SEED 600 STUDENTS, GUARDIANS & ENROLLMENTS
    // ══════════════════════════════════════════
    console.log('\n🧑‍🎓 Seeding 600 students and parent/guardians...');
    const STUDENT_ROLE_ID = 18;
    const PARENT_ROLE_ID = 20;

    const { rows: newlyCreatedClassSections } = await client.query("SELECT class_section_id, class_id FROM class_section ORDER BY class_section_id");

    const batchSize = 20;
    let studentIdCounter = 1;
    let userIdCounter = 200; // Start user_ids for students and parents from 200

    for (const cs of newlyCreatedClassSections) {
      const parentUserInserts = [];
      const studentUserInserts = [];
      const studentInserts = [];
      const guardianInserts = [];
      const enrollmentInserts = [];

      for (let i = 0; i < batchSize; i++) {
        const community = pickCommunity();
        const guardianFirst = randItem(community.maleFirstNames);
        const surname = randItem(community.surnames);
        const address = buildRandomAddress();

        const parentUserId = userIdCounter++;
        const studentUserId = userIdCounter++;

        const guardianEmail = `guardian${parentUserId}@temp.com`;
        const studentEmail = `student${studentUserId}@temp.com`;
        const phone = `900000${parentUserId}`;

        // Prepare users
        parentUserInserts.push(`(${parentUserId}, 'guardian${parentUserId}', 3, '${guardianEmail}', '${phone}', '${mockHash}', ${PARENT_ROLE_ID}, true, 'active')`);
        studentUserInserts.push(`(${studentUserId}, 'student${studentUserId}', 3, '${studentEmail}', '${phone}', '${mockHash}', ${STUDENT_ROLE_ID}, true, 'active')`);

        // Prepare student
        const stuFirst = randItem(community.firstNames);
        const stuMiddle = guardianFirst;
        const currentStudentId = studentIdCounter++;
        studentInserts.push(`(${currentStudentId}, ${studentUserId}, '${stuFirst}', '${stuMiddle}', '${surname}', '${studentEmail}', '${address}', '2014-06-15', 1, 1, '2024-06-01', ${activeStatusId})`);

        // Prepare guardian
        guardianInserts.push(`(${parentUserId}, '${guardianFirst}', '${surname}', ${currentStudentId}, '${phone}', '${guardianEmail}', '${address}', ${activeStatusId}, 1)`);

        // Prepare enrollment
        enrollmentInserts.push(`(${cs.class_id}, ${cs.class_section_id}, ${currentStudentId}, 1, 'Active', 3)`);
      }

      // Execute batches
      await client.query(`
        INSERT INTO "user" (user_id, user_name, institute_id, email, phone, password_hash, role_id, is_active, status) VALUES
          ${parentUserInserts.concat(studentUserInserts).join(',\n')}
      `);

      await client.query(`
        INSERT INTO student (student_id, student_user_id, stu_first_name, stu_middle_name, stu_last_name, email, address, date_of_birth, gender_id, bg_id, joined_date, user_status_id) VALUES
          ${studentInserts.join(',\n')}
      `);

      await client.query(`
        INSERT INTO guardian (guardian_user_id, grdn_first_name, grdn_last_name, student_id, phone, email, address, user_status_id, gender_id) VALUES
          ${guardianInserts.join(',\n')}
      `);

      await client.query(`
        INSERT INTO class_enrollment (class_id, class_section_id, student_id, status_id, status, institute_id) VALUES
          ${enrollmentInserts.join(',\n')}
      `);
    }

    console.log(`✅ Seeded 600 students, 600 guardians, 1200 user logins, and 600 enrollments.`);

    // ══════════════════════════════════════════
    // SEED SCHEDULES
    // ══════════════════════════════════════════
    console.log('\n📅 Seeding schedule slots...');
    const { rows: clsList } = await client.query("SELECT class_id FROM class ORDER BY class_id LIMIT 10");
    const { rows: stList } = await client.query("SELECT staff_id FROM staff WHERE role_id = $1 ORDER BY staff_id LIMIT 6", [teacherRoleId]);
    const { rows: subList } = await client.query("SELECT subject_id FROM subject ORDER BY subject_id LIMIT 6");

    const classIds = clsList.map(r => r.class_id);
    const staffIds = stList.map(r => r.staff_id);
    const subjectIds = subList.map(r => r.subject_id);

    const PERIODS_PER_DAY = 6;
    const DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
    const periodTimes = [
      { start: '09:00', end: '09:45' },
      { start: '09:50', end: '10:35' },
      { start: '10:40', end: '11:25' },
      { start: '11:30', end: '12:15' },
      { start: '13:00', end: '13:45' },
      { start: '13:50', end: '14:35' }
    ];

    const scheduleInserts = [];
    for (const classId of classIds) {
      for (const day of DAYS) {
        for (let p = 0; p < PERIODS_PER_DAY; p++) {
          const periodNo = p + 1;
          const { start, end } = periodTimes[p];

          const staffId   = staffIds[(classId + day + p) % staffIds.length];
          const subjectId = subjectIds[(classId + p) % subjectIds.length];

          scheduleInserts.push(`(${classId}, ${staffId}, ${subjectId}, ${day}, ${periodNo}, '${start}', '${end}', 3)`);
        }
      }
    }
    await client.query(`
      INSERT INTO schedule (class_id, staff_id, subject_id, day_of_week, period_number, start_time, end_time, institute_id) VALUES
        ${scheduleInserts.join(',\n')}
    `);
    console.log('✅ Seeded schedule.');

    // ══════════════════════════════════════════
    // SEED FEE CATEGORIES & STRUCTURES
    // ══════════════════════════════════════════
    console.log('\n💰 Seeding fee categories and structure...');
    await client.query(`
      INSERT INTO fee_category (category_name, description) VALUES
        ('Tuition Fee', 'Regular academic instruction charges.'),
        ('Development Fee', 'Infrastructure development and building maintenance.'),
        ('Examination Fee', 'Evaluation and report card generation costs.'),
        ('Library Fee', 'Library maintenance and resources.'),
        ('Laboratory Fee', 'Science and computer lab consumables.'),
        ('Transport Fee', 'School bus transportation charges.'),
        ('Other Expenses Fee', 'Miscellaneous co-curricular activities.')
    `);

    const { rows: feeCats } = await client.query("SELECT fee_category_id FROM fee_category");
    const { rows: clsFullList } = await client.query("SELECT class_id FROM class");

    const feeStructures = [];
    for (const cls of clsFullList) {
      for (const cat of feeCats) {
        const amount = cat.fee_category_id === 1 ? 15000.00 : 2000.00;
        feeStructures.push(`(${cls.class_id}, ${cat.fee_category_id}, ${amount}, '2025-2026', '2026-04-30', 3)`);
      }
    }
    await client.query(`
      INSERT INTO fee_structure (class_id, fee_cat_id, amount, session_year, due_date, institute_id) VALUES
        ${feeStructures.join(',\n')}
    `);
    console.log('✅ Seeded fee structure.');

    // ══════════════════════════════════════════
    // SEED EVENTS
    // ══════════════════════════════════════════
    console.log('\n🎪 Seeding general school events...');
    const schedStatusIdRes = await client.query("SELECT event_status_id FROM event_status WHERE event_status_name = 'Scheduled'");
    const schedStatusId = schedStatusIdRes.rows[0].event_status_id;

    await client.query(`
      INSERT INTO events (event_name, description, event_date, venue, event_status_id, event_start_date, event_end_date, institute_id) VALUES
        ('Sports Day', 'Track and field events, house matches', '2026-01-10', 'School Ground', ${schedStatusId}, '2026-01-10', '2026-01-10', 3),
        ('Republic Day', 'Flag hoisting and speeches', '2026-01-26', 'Assembly Ground', ${schedStatusId}, '2026-01-26', '2026-01-26', 3),
        ('Science Exhibition', 'Students experimental models display', '2026-02-10', 'Science Block', ${schedStatusId}, '2026-02-10', '2026-02-10', 3),
        ('Annual Day Celebration', 'Annual cultural gathering and performances', '2026-03-20', 'School Auditorium', ${schedStatusId}, '2026-03-20', '2026-03-20', 3),
        ('Yoga Day', 'Mass yoga session', '2026-06-21', 'School Ground', ${schedStatusId}, '2026-06-21', '2026-06-21', 3)
    `);
    console.log('✅ Seeded events.');

    // ══════════════════════════════════════════
    // SEED EXAMS
    // ══════════════════════════════════════════
    console.log('\n📝 Seeding exams for all classes...');
    const upcomingStatusRes = await client.query("SELECT exam_status_id FROM exam_status WHERE exam_status_name = 'Upcoming'");
    const upcomingStatusId = upcomingStatusRes.rows[0].exam_status_id;

    const examInserts = [];
    // Just seed exams for the first 3 classes to avoid query size limits but still have data
    for (let cId = 1; cId <= 3; cId++) {
      examInserts.push(`('Unit Test 1 - Class ${cId}', 1, ${cId}, 1, '2026-08-10 09:00:00+05:30', 60, 40, 14, 40, ${upcomingStatusId}, 3)`);
      examInserts.push(`('Term Exam - Class ${cId}', 2, ${cId}, 1, '2026-11-25 09:00:00+05:30', 120, 80, 28, 80, ${upcomingStatusId}, 3)`);
    }
    await client.query(`
      INSERT INTO exam (exam_name, exam_type_id, class_id, subject_id, date_time, duration_mins, total_score, min_marks, max_marks, exam_status_id, institute_id) VALUES
        ${examInserts.join(',\n')}
    `);
    console.log('✅ Seeded exams.');

    // ══════════════════════════════════════════
    // SEED LEAVE BALANCES FOR ACTIVE TEACHERS
    // ══════════════════════════════════════════
    console.log('\n💼 Seeding leave balances for teaching staff...');
    const { rows: teachingStaff } = await client.query("SELECT staff_id FROM staff WHERE role_id = $1", [teacherRoleId]);
    const { rows: lTypes } = await client.query("SELECT id, name, max_days_per_year FROM leave_types");

    const balances = [];
    for (const t of teachingStaff) {
      for (const lt of lTypes) {
        const maxDays = lt.name === 'Loss of Pay' ? 999 : lt.max_days_per_year;
        balances.push(`(${t.staff_id}, ${lt.id}, '2025-2026', ${maxDays}, 0, ${maxDays})`);
      }
    }
    await client.query(`
      INSERT INTO leave_balance (teacher_id, leave_type_id, academic_year, total_days, used_days, remaining_days) VALUES
        ${balances.join(',\n')}
    `);
    console.log('✅ Seeded leave balances.');

    // ══════════════════════════════════════════
    // SEED NOTICES
    // ══════════════════════════════════════════
    console.log('\n📢 Seeding notices...');
    await client.query(`
      INSERT INTO notice_audience (audience_type, audience_name) VALUES
        ('Entire School', 'All Students and Staff')
    `);
    const audIdRes = await client.query("SELECT audience_id FROM notice_audience LIMIT 1");
    const audienceId = audIdRes.rows[0].audience_id;

    await client.query(`
      INSERT INTO notices (title, content, author_name, author_type, author_id, audience_id, post_date, institute_id) VALUES
        ('School Reopens After Vacation', 'School will reopen on 10 June. All students must report in proper uniform.', 'Principal', 'admin', 3, ${audienceId}, '2026-05-25', 3),
        ('Uniform and ID Card Reminder', 'Students must carry ID cards daily.', 'Discipline In-charge', 'staff', 1, ${audienceId}, '2026-06-01', 3)
    `);
    console.log('✅ Seeded notices.');

    await client.query('COMMIT');
    console.log('\n=============================================');
    console.log('🎉 REINITIALIZATION AND SEEDING COMPLETED! 🎉');
    console.log('=============================================\n');
    process.exit(0);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ CRITICAL ERROR DURING REINITIALIZATION:');
    console.error(err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
