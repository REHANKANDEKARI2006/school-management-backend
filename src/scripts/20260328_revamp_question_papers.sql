-- 20260328_revamp_question_papers.sql
-- Drop old table if exists (as per "discard and rebuild from zero" instruction)
DROP TABLE IF EXISTS question_papers CASCADE;

-- 1. Main Table for Question Papers
CREATE TABLE question_papers (
    paper_id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exam(exam_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    class_id INTEGER REFERENCES class(class_id),
    subject_id INTEGER REFERENCES subject(subject_id),
    total_marks INTEGER DEFAULT 100,
    duration_mins INTEGER DEFAULT 180,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Published
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sections within a Paper
CREATE TABLE paper_sections (
    section_id SERIAL PRIMARY KEY,
    paper_id INTEGER REFERENCES question_papers(paper_id) ON DELETE CASCADE,
    section_name VARCHAR(255), -- e.g., 'Section A: Objective'
    section_order INTEGER DEFAULT 0,
    total_section_marks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Questions within a Section
CREATE TABLE questions (
    question_id SERIAL PRIMARY KEY,
    section_id INTEGER REFERENCES paper_sections(section_id) ON DELETE CASCADE,
    question_type VARCHAR(100) NOT NULL, -- e.g., 'MCQ_TEXT', 'ASSERTION_REASON'
    question_text TEXT,
    question_data JSONB, -- Stores options, correct answers, image URLs, etc.
    marks INTEGER DEFAULT 1,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance
CREATE INDEX idx_paper_exam ON question_papers(exam_id);
CREATE INDEX idx_section_paper ON paper_sections(paper_id);
CREATE INDEX idx_question_section ON questions(section_id);
