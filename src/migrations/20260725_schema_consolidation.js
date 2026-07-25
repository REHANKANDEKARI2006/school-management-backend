/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCHEMA CONSOLIDATION MIGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This migration is fully IDEMPOTENT — every statement uses
 * "IF NOT EXISTS" so it is safe to run repeatedly on existing databases
 * without data loss.
 *
 * Run with:  node src/migrations/20260725_schema_consolidation.js
 * ═══════════════════════════════════════════════
 */
import db from '../config/db.js';

async function run() {
  const client = await db.connect();
  console.log('\n══════════════════════════════════════════════');
  console.log('  SCHEMA CONSOLIDATION MIGRATION — START');
  console.log('══════════════════════════════════════════════\n');

  try {
    await client.query('BEGIN');

    // ─────────────────────────────────────────────
    // 1. FEE STRUCTURE
    // ─────────────────────────────────────────────
    console.log('📦 [1/10] Creating fee_structure ...');
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
    console.log('   ✅ fee_structure ready.');

    // ─────────────────────────────────────────────
    // 2. FEE COLLECTION
    // ─────────────────────────────────────────────
    console.log('📦 [2/10] Creating fee_collection ...');
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
    console.log('   ✅ fee_collection ready.');

    // ─────────────────────────────────────────────
    // 3. FEE INSTALLMENT
    // ─────────────────────────────────────────────
    console.log('📦 [3/10] Creating fee_installment ...');
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
    console.log('   ✅ fee_installment ready.');

    // ─────────────────────────────────────────────
    // 4. STUDENT RESULTS
    // ─────────────────────────────────────────────
    console.log('📦 [4/10] Creating student_results ...');
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
        UNIQUE (student_id, exam_name)
      )
    `);
    console.log('   ✅ student_results ready.');

    // ─────────────────────────────────────────────
    // 5. PAPER SECTIONS + QUESTIONS
    // ─────────────────────────────────────────────
    console.log('📦 [5/10] Creating paper_sections + questions ...');

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

    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS passing_marks       INTEGER`);
    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS difficulty_level    VARCHAR(50)`);
    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS shuffle_questions   BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS shuffle_options     BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS show_marks          BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS show_instructions   BOOLEAN DEFAULT TRUE`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_sections (
        section_id          SERIAL PRIMARY KEY,
        paper_id            INTEGER NOT NULL REFERENCES question_papers(paper_id) ON DELETE CASCADE,
        section_name        VARCHAR(255),
        title               VARCHAR(255),
        instructions        TEXT,
        section_order       INTEGER DEFAULT 1,
        total_section_marks DOUBLE PRECISION DEFAULT 0,
        created_at          TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        question_id    SERIAL PRIMARY KEY,
        section_id     INTEGER NOT NULL REFERENCES paper_sections(section_id) ON DELETE CASCADE,
        question_text  TEXT NOT NULL,
        question_type  VARCHAR(50) DEFAULT 'subjective',
        question_data  JSONB DEFAULT '{}',
        marks          DOUBLE PRECISION DEFAULT 1,
        options        JSONB DEFAULT '[]',
        question_order INTEGER DEFAULT 1,
        difficulty     VARCHAR(50) DEFAULT 'Medium',
        answer_key     TEXT,
        explanation    TEXT,
        blooms_taxonomy VARCHAR(100),
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('   ✅ paper_sections + questions ready.');

    // ─────────────────────────────────────────────
    // 6. TEMPLATE CUSTOM CONTENT
    // ─────────────────────────────────────────────
    console.log('📦 [6/10] Creating template_custom_content ...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS template_custom_content (
        id             SERIAL PRIMARY KEY,
        document_type  VARCHAR(50) NOT NULL,
        template_id    VARCHAR(50) NOT NULL,
        language       VARCHAR(20) NOT NULL,
        title          TEXT,
        paragraph      TEXT,
        remarks        TEXT,
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        UNIQUE(document_type, template_id, language, institute_id)
      )
    `);
    console.log('   ✅ template_custom_content ready.');

    // ─────────────────────────────────────────────
    // 7. GENERATED DOCUMENTS
    // ─────────────────────────────────────────────
    console.log('📦 [7/10] Creating generated_documents ...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id             SERIAL PRIMARY KEY,
        student_id     INTEGER REFERENCES student(student_id) ON DELETE CASCADE,
        doc_type       VARCHAR(50) NOT NULL,
        template_id    VARCHAR(100),
        generated_by   INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('   ✅ generated_documents ready.');

    // ─────────────────────────────────────────────
    // 8. ACTIVITY LOG
    // ─────────────────────────────────────────────
    console.log('📦 [8/10] Creating activity_log ...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        action_type    VARCHAR(255) NOT NULL,
        description    TEXT,
        entity_type    VARCHAR(50),
        entity_id      INTEGER,
        details        JSONB,
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('   ✅ activity_log ready.');

    // ─────────────────────────────────────────────
    // 9. STUDENT SUBMISSIONS
    // ─────────────────────────────────────────────
    console.log('📦 [9/10] Creating student_submissions ...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_submissions (
        id             SERIAL PRIMARY KEY,
        material_id    INTEGER REFERENCES materials(material_id) ON DELETE CASCADE,
        student_id     INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        staff_id       INTEGER REFERENCES staff(staff_id) ON DELETE CASCADE,
        title          VARCHAR(255),
        file_url       TEXT,
        file_path      VARCHAR(255),
        status         VARCHAR(20) DEFAULT 'submitted',
        grade          VARCHAR(10),
        feedback       TEXT,
        remarks        TEXT,
        submitted_at   TIMESTAMPTZ DEFAULT now(),
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('   ✅ student_submissions ready.');

    // ─────────────────────────────────────────────
    // 10. MISSING HELPER TABLES
    // ─────────────────────────────────────────────
    console.log('📦 [10/10] Creating remaining helper tables ...');

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_holidays (
        id             SERIAL PRIMARY KEY,
        holiday_name   VARCHAR(150) NOT NULL,
        day            INTEGER NOT NULL,
        month          INTEGER NOT NULL,
        state_tag      VARCHAR(50),
        is_active      BOOLEAN DEFAULT true,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_messages (
        id           SERIAL PRIMARY KEY,
        sender_id    INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        subject      VARCHAR(255),
        body         TEXT NOT NULL,
        is_read      BOOLEAN DEFAULT false,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_requests (
        id           SERIAL PRIMARY KEY,
        teacher_id   INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        request_type VARCHAR(50) NOT NULL,
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        status       VARCHAR(20) DEFAULT 'pending',
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    console.log('   ✅ All helper tables ready.');


    // ═══════════════════════════════════════════════
    // ADD MISSING COLUMNS TO EXISTING TABLES
    // ═══════════════════════════════════════════════
    console.log('\n🔧 Adding missing columns to existing tables ...');

    await client.query(`ALTER TABLE fee_category ADD COLUMN IF NOT EXISTS allow_installments BOOLEAN DEFAULT FALSE`);

    const spCols = [
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS institute_id INTEGER`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS affiliation_number VARCHAR(100)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS affiliation_no VARCHAR(100)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS school_code VARCHAR(100)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS established_year INTEGER`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS motto TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS website VARCHAR(255)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS signature_url TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS secondary_logo_url TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS stamp_url TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS cashier_signature_url TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#3b82f6'`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS header_bg_color VARCHAR(20) DEFAULT '#1a237e'`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS header_text_color VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#ff6f00'`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS watermark_opacity DECIMAL(3,2) DEFAULT 0.08`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS header_layout_type VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_text TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_bg_color VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_left_text TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS footer_right_text TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS page_number_format VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS show_generation_date BOOLEAN`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS show_watermark BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_style VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_color VARCHAR(20)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS separator_thickness INTEGER`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS school_type VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS accreditation_line TEXT`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS document_config JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS id_card_config JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS bonafide_config JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS achievement_config JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS fee_receipt_config JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS document_theme JSONB`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS is_document_theme_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_id_card_template VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_bonafide_template VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_mark_sheet_template VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_general_certificate_template VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_leaving_certificate_template VARCHAR(50)`,
      `ALTER TABLE school_profile ADD COLUMN IF NOT EXISTS selected_fee_receipt_template VARCHAR(50)`,
    ];
    for (const stmt of spCols) {
      try { await client.query(stmt); } catch(e) { /* skip */ }
    }

    await client.query(`ALTER TABLE exam ADD COLUMN IF NOT EXISTS marks_status VARCHAR(50) DEFAULT 'Pending'`);
    await client.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER`);

    await client.query(`ALTER TABLE master_admin ADD COLUMN IF NOT EXISTS profile_url TEXT`);
    await client.query(`ALTER TABLE admin ADD COLUMN IF NOT EXISTS profile_url TEXT`);
    await client.query(`ALTER TABLE guardian ADD COLUMN IF NOT EXISTS profile_url TEXT`);

    console.log('   ✅ All missing columns added.');

    await client.query('COMMIT');

    // ═══════════════════════════════════════════════
    // PERFORMANCE INDEXES (Each executed independently)
    // ═══════════════════════════════════════════════
    console.log('\n⚡ Creating performance indexes ...');

    const indexes = [
      // Student & enrollment
      `CREATE INDEX IF NOT EXISTS idx_student_user_id        ON student (student_user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_student_is_deleted     ON student (is_deleted)`,
      `CREATE INDEX IF NOT EXISTS idx_class_enrollment_student ON class_enrollment (student_id, status_id)`,
      `CREATE INDEX IF NOT EXISTS idx_class_enrollment_class   ON class_enrollment (class_id)`,

      // User & staff
      `CREATE INDEX IF NOT EXISTS idx_user_institute_role    ON "user" (institute_id, role_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_email             ON "user" (email)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_user_id          ON staff (user_id)`,

      // Attendance
      `CREATE INDEX IF NOT EXISTS idx_att_session_class_date ON attendance_session (class_id, attendance_date)`,
      `CREATE INDEX IF NOT EXISTS idx_att_session_institute  ON attendance_session (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_att_record_session_stu ON attendance_record (session_id, student_id)`,

      // Fees
      `CREATE INDEX IF NOT EXISTS idx_fee_struct_class       ON fee_structure (class_id, institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fee_collection_student ON fee_collection (student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fee_collection_struct  ON fee_collection (fee_struct_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fee_collection_date    ON fee_collection (payment_date)`,
      `CREATE INDEX IF NOT EXISTS idx_fee_installment_struct ON fee_installment (fee_struct_id)`,

      // Exams & Grades & Results
      `CREATE INDEX IF NOT EXISTS idx_exam_class_subject     ON exam (class_id, subject_id)`,
      `CREATE INDEX IF NOT EXISTS idx_exam_institute         ON exam (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_exam_grades_exam_stu   ON exam_grades (exam_id, student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_student_results_stu    ON student_results (student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_student_results_class  ON student_results (class_id)`,

      // Guardian Schema Fix: Drop unique constraint on guardian_user_id to support siblings
      `ALTER TABLE guardian DROP CONSTRAINT IF EXISTS guardian_guardian_user_id_key`,

      // Schedule
      `CREATE INDEX IF NOT EXISTS idx_schedule_staff_day     ON schedule (staff_id, day_of_week)`,
      `CREATE INDEX IF NOT EXISTS idx_schedule_class_day     ON schedule (class_id, day_of_week)`,
      `CREATE INDEX IF NOT EXISTS idx_schedule_institute     ON schedule (institute_id)`,

      // Notices & Events
      `CREATE INDEX IF NOT EXISTS idx_notices_institute      ON notices (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_events_institute       ON events (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_events_date            ON events (event_date)`,

      // Leave & Substitutes
      `CREATE INDEX IF NOT EXISTS idx_leave_app_teacher_st   ON leave_applications (teacher_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_leave_app_institute    ON leave_applications (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sub_assign_date        ON substitute_assignments (assignment_date)`,
      `CREATE INDEX IF NOT EXISTS idx_sub_assign_sub_teacher ON substitute_assignments (substitute_teacher_id)`,

      // Question papers & bank
      `CREATE INDEX IF NOT EXISTS idx_qp_institute           ON question_papers (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_paper_sections_paper   ON paper_sections (paper_id)`,
      `CREATE INDEX IF NOT EXISTS idx_questions_section      ON questions (section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_qbank_institute        ON question_bank (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_qbank_subject          ON question_bank (subject)`,

      // Activity log & generated docs
      `CREATE INDEX IF NOT EXISTS idx_activity_log_inst      ON activity_log (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_log_created   ON activity_log (created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_gen_docs_student       ON generated_documents (student_id)`,

      // Materials & Notifications
      `CREATE INDEX IF NOT EXISTS idx_materials_class        ON materials (class_id)`,
      `CREATE INDEX IF NOT EXISTS idx_materials_institute    ON materials (institute_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications (user_id, is_read)`,
    ];

    let createdCount = 0;
    for (const idx of indexes) {
      try {
        await client.query(idx);
        createdCount++;
      } catch (e) {
        console.warn(`   ⚠️ Index skipped: ${e.message.split('\n')[0]}`);
      }
    }

    console.log(`   ✅ ${createdCount} performance indexes checked/created.`);

    console.log('\n══════════════════════════════════════════════');
    console.log('  🎉 SCHEMA CONSOLIDATION COMPLETE');
    console.log('══════════════════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

run();
