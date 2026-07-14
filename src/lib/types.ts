export type JobStatus =
  // 초기
  | "monitoring"     // 모니터링
  | "available"      // 접수중
  // 지원
  | "applied"        // 서류제출
  // 서류
  | "doc_fail"       // 서류불합격
  // 필기
  | "written_wait"   // 필기대기
  | "written_pass"   // 필기합격
  | "written_fail"   // 필기불합격
  // 면접
  | "interview_wait"  // 면접대기
  | "interview_pass"  // 면접합격
  | "interview_fail"  // 면접불합격
  // 최종
  | "final_pass"     // 최종합격
  // 기타
  | "withdrawn"      // 패스(미지원)
  | "expired";       // 마감(미지원)

export const STATUS_LABELS: Record<JobStatus, string> = {
  monitoring:     "모니터링",
  available:      "접수중",
  applied:        "서류제출",
  doc_fail:       "서류불합격",
  written_wait:   "필기대기",
  written_pass:   "필기합격",
  written_fail:   "필기불합격",
  interview_wait: "면접대기",
  interview_pass: "면접합격",
  interview_fail: "면접불합격",
  final_pass:     "최종합격",
  withdrawn:      "패스(미지원)",
  expired:        "마감(미지원)",
};

// 배경은 모두 동일한 무채색(회색)으로 통일하고, 글자색만 상태별로 구분한다.
// 채도 높은 형광색(민트 등)은 피하고 톤 다운된 색만 사용.
// 모든 상태를 동일한 회색으로 통일 (구분은 그룹 섹션으로 이미 되어 있으므로 배지 자체는 무채색)
const UNIFORM_STATUS_COLOR = "bg-gray-100 text-gray-600";
export const STATUS_COLORS: Record<JobStatus, string> = {
  monitoring:     UNIFORM_STATUS_COLOR,
  available:      UNIFORM_STATUS_COLOR,
  applied:        UNIFORM_STATUS_COLOR,
  doc_fail:       UNIFORM_STATUS_COLOR,
  written_wait:   UNIFORM_STATUS_COLOR,
  written_pass:   UNIFORM_STATUS_COLOR,
  written_fail:   UNIFORM_STATUS_COLOR,
  interview_wait: UNIFORM_STATUS_COLOR,
  interview_pass: UNIFORM_STATUS_COLOR,
  interview_fail: UNIFORM_STATUS_COLOR,
  final_pass:     UNIFORM_STATUS_COLOR,
  withdrawn:      UNIFORM_STATUS_COLOR,
  expired:        UNIFORM_STATUS_COLOR,
};

export interface Job {
  id: string;
  title: string;
  organization: string | null;
  url: string | null;
  duty: string | null;
  employment_type: string | null;
  fit: number | null;
  fit_reason: string | null;
  work_location: string | null;
  eligibility: string | null;
  selection_method: string | null;
  headcount: number | null;
  salary: string | null;
  application_start: string | null;
  application_end: string | null;
  doc_announcement_date: string | null;
  written_exam_date: string | null;
  interview_date: string | null;
  interview_date_2: string | null;
  announcement_date: string | null;
  notes: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type JobInsert = Omit<Job, "id" | "created_at" | "updated_at">;
export type JobUpdate = Partial<JobInsert>;
