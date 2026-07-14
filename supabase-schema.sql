-- Supabase에서 실행할 SQL 스키마
-- SQL Editor > New Query 에서 아래 내용을 붙여넣고 실행하세요

CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT,
  url TEXT,
  duty TEXT,                  -- 직무 (일반직 6급, 행정직, 사무행정 등)
  employment_type TEXT,       -- 정규직, 계약직, 무기계약직, 기간제 등
  fit INTEGER DEFAULT 0,      -- 직무 적합도 (0=미평가, 1~5 별점)
  fit_reason TEXT,            -- 적합도 판단 근거 (AI 생성)
  work_location TEXT,         -- 근무지
  eligibility TEXT,           -- 지원자격
  selection_method TEXT,      -- 선발방식
  headcount INTEGER,          -- 선발인원
  salary TEXT,                -- 급여/보수
  application_start DATE,     -- 접수시작일
  application_end DATE,       -- 접수마감일
  doc_announcement_date DATE, -- 서류발표일
  written_exam_date DATE,     -- 필기시험일
  interview_date DATE,        -- 면접일 (1차)
  interview_date_2 DATE,      -- 면접일 (2차)
  announcement_date DATE,     -- 최종발표일
  notes TEXT,                 -- 내 메모
  status TEXT DEFAULT 'monitoring' CHECK (
    status IN (
      'monitoring', 'available',
      'applied', 'doc_fail',
      'written_wait', 'written_pass', 'written_fail',
      'interview_wait', 'interview_pass', 'interview_fail',
      'final_pass', 'withdrawn', 'expired'
    )
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- (선택) Row Level Security - 본인만 접근하도록
-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
