import { Job, JobStatus, STATUS_LABELS } from "./types";
import { parseLocalDate } from "./dates";

export type SortField =
  | "organization"
  | "status"
  | "fit"
  | "employment_type"
  | "work_location"
  | "application_end"
  | "doc_announcement_date"
  | "written_exam_date"
  | "interview_date"
  | "interview_date_2"
  | "announcement_date"
  | "created_at";

export type SortDir = "asc" | "desc";

const DATE_FIELDS = new Set<SortField>([
  "application_end",
  "doc_announcement_date",
  "written_exam_date",
  "interview_date",
  "interview_date_2",
  "announcement_date",
  "created_at",
]);

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
