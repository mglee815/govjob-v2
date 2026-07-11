export type JobStatus =
  | "bookmarked"
  | "planning"
  | "applied"
  | "doc_pass"
  | "written_pass"
  | "interview_pass"
  | "final_pass"
  | "failed"
  | "withdrawn";

export const STATUS_LABELS: Record<JobStatus, string> = {
  bookmarked: "관심",
  planning: "지원예정",
  applied: "지원완료",
  doc_pass: "서류합격",
  written_pass: "필기합격",
  interview_pass: "면접합격",
  final_pass: "최종합격",
  failed: "불합격",
  withdrawn: "포기",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  bookmarked: "bg-gray-100 text-gray-700",
  planning: "bg-blue-100 text-blue-700",
  applied: "bg-indigo-100 text-indigo-700",
  doc_pass: "bg-yellow-100 text-yellow-700",
  written_pass: "bg-orange-100 text-orange-700",
  interview_pass: "bg-purple-100 text-purple-700",
  final_pass: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-400",
};

export interface Job {
  id: string;
  title: string;
  organization: string | null;
  url: string | null;
  employment_type: string | null;
  work_location: string | null;
  eligibility: string | null;
  selection_method: string | null;
  headcount: number | null;
  salary: string | null;
  application_start: string | null;
  application_end: string | null;
  written_exam_date: string | null;
  interview_date: string | null;
  announcement_date: string | null;
  notes: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type JobInsert = Omit<Job, "id" | "created_at" | "updated_at">;
export type JobUpdate = Partial<JobInsert>;
