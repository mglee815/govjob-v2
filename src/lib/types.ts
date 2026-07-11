export type JobStatus =
  // 초기
  | "collected"      // 수집
  | "monitoring"     // 모니터링
  | "check_needed"   // 확인필요
  | "available"      // 접수중
  | "watching"       // 다음공고대기
  // 지원
  | "applied"        // 서류제출
  // 서류
  | "doc_pass"       // 서류합격
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
  collected:      "수집",
  monitoring:     "모니터링",
  check_needed:   "확인필요",
  available:      "접수중",
  watching:       "다음공고대기",
  applied:        "서류제출",
  doc_pass:       "서류합격",
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

export const STATUS_COLORS: Record<JobStatus, string> = {
  collected:      "bg-slate-100 text-slate-600",
  monitoring:     "bg-gray-100 text-gray-600",
  check_needed:   "bg-amber-50 text-amber-700",
  available:      "bg-blue-100 text-blue-700",
  watching:       "bg-sky-100 text-sky-700",
  applied:        "bg-indigo-100 text-indigo-700",
  doc_pass:       "bg-yellow-100 text-yellow-700",
  doc_fail:       "bg-red-100 text-red-600",
  written_wait:   "bg-teal-100 text-teal-700",
  written_pass:   "bg-orange-100 text-orange-700",
  written_fail:   "bg-red-100 text-red-600",
  interview_wait: "bg-violet-100 text-violet-700",
  interview_pass: "bg-purple-100 text-purple-700",
  interview_fail: "bg-red-100 text-red-600",
  final_pass:     "bg-green-100 text-green-700",
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
