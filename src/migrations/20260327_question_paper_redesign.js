// src/migrations/20260327_question_paper_redesign.js
// Redesigns the question_papers table, adds paper_format_templates and question_bank tables

import db from '../config/db.js';

export async function redesignQuestionPaperTables() {
  try {
    await db.query(`
      -- Step 1: Drop old question_papers table (no production data to keep)
      DROP TABLE IF EXISTS question_papers CASCADE;

      -- Step 2: New paper-centric question_papers table
      CREATE TABLE IF NOT EXISTS question_papers (
        paper_id            SERIAL PRIMARY KEY,
        title               VARCHAR(255),
        class_name          VARCHAR(20)  NOT NULL,
        section             VARCHAR(10),              -- NULL = applies to all sections
        subject             VARCHAR(100) NOT NULL,
        exam_type           VARCHAR(50),              -- unit_test, ca, half_yearly, annual, practice
        exam_date           DATE,
        total_marks         INTEGER      NOT NULL DEFAULT 80,
        duration_mins       INTEGER      NOT NULL DEFAULT 180,
        sections            JSONB        NOT NULL DEFAULT '[]',
        status              VARCHAR(20)  NOT NULL DEFAULT 'draft', -- draft | final
        format_template_id  INTEGER,
        created_by          INTEGER,
        created_at          TIMESTAMPTZ  DEFAULT now(),
        updated_at          TIMESTAMPTZ  DEFAULT now()
      );

      -- Step 3: Paper format templates table
      CREATE TABLE IF NOT EXISTS paper_format_templates (
        template_id   SERIAL PRIMARY KEY,
        class_group   VARCHAR(20)  NOT NULL,  -- '1-2', '3-5', '6-8', '9-10'
        subject       VARCHAR(100) NOT NULL,
        exam_type     VARCHAR(50),            -- NULL = base (applies to all exam types)
        total_marks   INTEGER,
        duration_mins INTEGER,
        sections      JSONB        NOT NULL,
        created_at    TIMESTAMPTZ  DEFAULT now(),
        updated_at    TIMESTAMPTZ  DEFAULT now(),
        UNIQUE (class_group, subject, exam_type)
      );

      -- Step 4: Question bank table
      CREATE TABLE IF NOT EXISTS question_bank (
        question_id     SERIAL PRIMARY KEY,
        class_group     VARCHAR(20),          -- '1-2', '3-5', '6-8', '9-10'
        class_specific  VARCHAR(10),          -- '8', '9' etc.; NULL means whole group
        subject         VARCHAR(100) NOT NULL,
        chapter         VARCHAR(200),
        question_type   VARCHAR(50)  NOT NULL,
        question_text   TEXT         NOT NULL,
        options         JSONB,                -- for MCQ: [{label:"A",text:"..."}, ...]
        answer          TEXT,                 -- for answer key
        difficulty      VARCHAR(10)  DEFAULT 'medium', -- easy | medium | hard
        marks           INTEGER      DEFAULT 1,
        tags            TEXT[]       DEFAULT '{}',
        added_by        INTEGER,
        created_at      TIMESTAMPTZ  DEFAULT now()
      );
    `);

    console.log('✅ Question paper redesign tables created.');
  } catch (error) {
    console.error('redesignQuestionPaperTables error:', error);
    throw error;
  }
}

export async function dropRedesignedTables() {
  try {
    await db.query(`
      DROP TABLE IF EXISTS question_bank CASCADE;
      DROP TABLE IF EXISTS paper_format_templates CASCADE;
      DROP TABLE IF EXISTS question_papers CASCADE;
    `);
    console.log('✅ Redesigned question paper tables dropped.');
  } catch (error) {
    console.error('dropRedesignedTables error:', error);
    throw error;
  }
}

redesignQuestionPaperTables();
