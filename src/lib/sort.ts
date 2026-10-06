import { Job, JobStatus, STATUS_LABELS } from "./types";
import { parseLocalDate, TODAY_MS } from "./dates";

export type SortField =
  | "organization"
  | "status"
  | "fit"
  | "employment_type"
  | "work_location"
  | "application_start"
  | "application_end"
  | "applied_at"
  | "doc_announcement_date"
  | "written_exam_date"
  | "interview_date"
  | "interview_date_2"
  | "announcement_date"
  | "created_at";

export type SortDir = "asc" | "desc";

const DATE_FIELDS = new Set<SortField>([
  "application_start",
  "application_end",
  "applied_at",
  "doc_announcement_date",
  "written_exam_date",
  "interview_date",
  "interview_date_2",
  "announcement_date",
  "created_at",
]);

// "예정일" 성격의 필드: 오름차순이면 아직 안 지난 날짜(오늘 포함)를 가까운 순으로 먼저, 지난 날짜는 뒤로 보낸다.
// 불합격·패스·마감 건은 일정이 남아있어도 맨 뒤로 보내서 "챙겨야 할 것"이 위에 모이게 한다.
export const SCHEDULE_SORT_FIELDS = new Set<SortField>([
  "application_end",
  "doc_announcement_date",
  "written_exam_date",
  "interview_date",
  "interview_date_2",
  "announcement_date",
]);

const INACTIVE_STATUSES: JobStatus[] = ["doc_fail", "written_fail", "interview_fail", "withdrawn", "expired"];

function dateValue(job: Job, field: SortField): number | null {
  if (field === "created_at") return new Date(job.created_at).getTime();
  return parseLocalDate(job[field as keyof Job] as string | null);
}

export function sortJobs(jobs: Job[], field: SortField, dir: SortDir): Job[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...jobs].sort((a, b) => {
    if (field === "fit") {
      return mul * ((a.fit ?? 0) - (b.fit ?? 0));
    }
    if (SCHEDULE_SORT_FIELDS.has(field)) {
      const inactiveA = INACTIVE_STATUSES.includes(a.status);
      const inactiveB = INACTIVE_STATUSES.includes(b.status);
      if (inactiveA !== inactiveB) return inactiveA ? 1 : -1;
      const ta = dateValue(a, field);
      const tb = dateValue(b, field);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      if (dir === "desc") return tb - ta;
      const upcomingA = ta >= TODAY_MS;
      const upcomingB = tb >= TODAY_MS;
      if (upcomingA !== upcomingB) return upcomingA ? -1 : 1;
      return upcomingA ? ta - tb : tb - ta;
    }
    if (DATE_FIELDS.has(field)) {
      const ta = dateValue(a, field);
      const tb = dateValue(b, field);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return mul * (ta - tb);
    }
    const va = field === "status" ? STATUS_LABELS[a.status as JobStatus] : ((a[field as keyof Job] as string | null) ?? "");
    const vb = field === "status" ? STATUS_LABELS[b.status as JobStatus] : ((b[field as keyof Job] as string | null) ?? "");
    return mul * String(va).localeCompare(String(vb), "ko");
  });
}
