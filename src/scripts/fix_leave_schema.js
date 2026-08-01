import dotenv from "dotenv";
dotenv.config();
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("🛠️ Fixing leave_applications and substitute_assignments schemas...");

  // Drop existing empty tables and recreate with proper schemas
  await pool.query(`
    DROP TABLE IF EXISTS substitute_assignments CASCADE;
    DROP TABLE IF EXISTS leave_applications CASCADE;

    CREATE TABLE leave_applications (
      id                  SERIAL PRIMARY KEY,
      teacher_id          INTEGER       NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
      leave_type_id       INTEGER       NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
      from_date           DATE          NOT NULL,
      to_date             DATE          NOT NULL,
      total_days          DECIMAL(5,1)  NOT NULL DEFAULT 1,
      reason              TEXT,
      document_url        TEXT,
      status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','cancelled')),
      applied_at          TIMESTAMPTZ   DEFAULT now(),
      actioned_by_user_id INTEGER       REFERENCES "user"(user_id) ON DELETE SET NULL,
      actioned_at         TIMESTAMPTZ,
      admin_remarks       TEXT,
      institute_id        INTEGER       REFERENCES institute(institute_id) ON DELETE CASCADE
    );

    CREATE TABLE substitute_assignments (
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
    );

    CREATE INDEX IF NOT EXISTS idx_leave_app_teacher_st ON leave_applications (teacher_id, status);
    CREATE INDEX IF NOT EXISTS idx_leave_app_institute  ON leave_applications (institute_id);
    CREATE INDEX IF NOT EXISTS idx_sub_assign_sub_teacher ON substitute_assignments (substitute_teacher_id);
  `);

  console.log("✅ Recreated leave_applications and substitute_assignments tables with correct schema.");

  // Also verify notifications table has related_leave_id column properly linked
  await pool.query(`
    ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS related_leave_id INTEGER REFERENCES leave_applications(id) ON DELETE SET NULL;
  `);

  console.log("✅ Schema migration completed successfully!");
  process.exit();
}

main().catch(err => {
  console.error("❌ Schema fix failed:", err);
  process.exit(1);
});
