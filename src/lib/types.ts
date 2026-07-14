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
export const STATUS_COLORS: Record<JobStatus, string> = {
  monitoring:     "bg-gray-100 text-gray-600",
  available:      "bg-gray-100 text-blue-700",
  applied:        "bg-gray-100 text-indigo-700",
  doc_fail:       "bg-gray-100 text-red-700",
  written_wait:   "bg-gray-100 text-sky-700",
  written_pass:   "bg-gray-100 text-orange-700",
  written_fail:   "bg-gray-100 text-pink-700",
  interview_wait: "bg-gray-100 text-violet-700",
  interview_pass: "bg-gray-100 text-purple-700",
  interview_fail: "bg-gray-100 text-rose-800",
  final_pass:     "bg-gray-100 text-emerald-700",
  withdrawn:      "bg-gray-100 text-gray-400",
  expired:        "bg-gray-100 text-gray-400",
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
