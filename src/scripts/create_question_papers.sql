-- src/scripts/create_question_papers.sql
CREATE TABLE IF NOT EXISTS question_papers (
    paper_id   SERIAL PRIMARY KEY,
    exam_id    INTEGER NOT NULL UNIQUE,
    template_id VARCHAR(50),
    content    JSONB NOT NULL,
    passage    TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT question_paper_exam_id_fkey
        FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE CASCADE
);
