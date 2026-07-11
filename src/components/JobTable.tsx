"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { daysFromToday, parseLocalDate } from "@/lib/dates";

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];

// v1 Oa 색상 맵 (fit 점수별 왼쪽 보더 색)
const FIT_BORDER: Record<number, string> = {
  5: "#48BB78",
  4: "#4299E1",
  3: "#ECC94B",
  2: "#ED8936",
  1: "#A0AEC0",
  0: "#E2E8F0",
};

// v1 정확한 hex 색상
const COLORS = {
  passBg: "#D6F5E8",
  passText: "#0E6644",
  failBg: "#FDDCDC",
  failText: "#A32D2D",
  appliedBg: "#E8F0FE",
  appliedText: "#1A56DB",
  monitoringBg: "#FEF3C7",
  monitoringText: "#92400E",
  withdrawnBg: "#F9FAFB",
  withdrawnText: "#9CA3AF",
  star: "#BA7517",
  starEmpty: "#E2E8F0",
  cardBorder: "#E2E8F0",
  headerBg: "#F7FAFC",
  headerText: "#718096",
  bodyText: "#374151",
  metaText: "#6B7280",
  // 마감일 pill
  ongoing: { bg: "#E1F5EE", col: "#085041" },       // 상시
  undecided: { bg: "#F1EFE8", col: "#5F5E5A" },      // 미정
  closed: { bg: "#F1EFE8", col: "#777770" },         // 마감
  urgent: { bg: "#FCEBEB", col: "#A32D2D" },         // D-3 이내 / 오늘
  soon: { bg: "#FFF3E0", col: "#B45309" },           // D-4~7
  distant: { bg: "#F1EFE8", col: "#5F5E5A" },        // D-8 이상
};

const PASS_STATUSES = new Set<JobStatus>(["doc_pass", "written_pass", "interview_pass", "final_pass"]);
const FAIL_STATUSES = new Set<JobStatus>(["doc_fail", "written_fail", "interview_fail"]);
const APPLIED_STATUSES = new Set<JobStatus>(["applied"]);
const MONITORING_STATUSES = new Set<JobStatus>(["monitoring"]);
const WITHDRAWN_STATUSES = new Set<JobStatus>(["withdrawn", "expired"]);
const WATCHING_STATUSES = new Set<JobStatus>(["watching"]);

// v1 style 별점
function FitStars({ fit, reason }: { fit: number | null; reason: string | null }) {
  const n = fit ?? 0;
  if (n === 0) return <span className="text-xs" style={{ color: "#A0AEC0" }}>-</span>;
  return (
    <span
      title={reason ?? ""}
      style={{
        color: COLORS.star,
        letterSpacing: -1,
        fontSize: 15,
        cursor: "help",
        whiteSpace: "nowrap",
      }}
    >
      {"★".repeat(n)}
      <span style={{ color: COLORS.starEmpty }}>{"☆".repeat(5 - n)}</span>
    </span>
  );
}

// v1 style pill: 마감일/다음 관문 등에 사용
function DeadlinePill({
  date,
  status,
  compact,
}: {
  date: string | null;
  status?: JobStatus;
  compact?: boolean;
}) {
  const pad = compact ? "px-1.5 py-[1px]" : "px-2 py-0.5";
  const cls = `inline-block ${pad} rounded text-[10px] font-medium whitespace-nowrap`;

  if (!date) {
    if (status && WATCHING_STATUSES.has(status)) {
      return <span className={cls} style={{ background: COLORS.ongoing.bg, color: COLORS.ongoing.col }}>상시</span>;
    }
    return <span className={cls} style={{ background: COLORS.undecided.bg, color: COLORS.undecided.col }}>미정</span>;
  }

  const t = parseLocalDate(date)!;
  const dt = new Date(t);
  const diff = daysFromToday(date)!;
  const mm = dt.getMonth() + 1;
  const dd = dt.getDate();
  const mmdd = `${mm}/${dd}`;

  if (diff < 0)  return <span className={cls} style={{ background: COLORS.closed.bg, color: COLORS.closed.col }}>마감 ({mmdd})</span>;
  if (diff === 0) return <span className={cls} style={{ background: COLORS.urgent.bg, color: COLORS.urgent.col, fontWeight: 700 }}>오늘 ({mmdd})</span>;
  if (diff <= 3)  return <span className={cls} style={{ background: COLORS.urgent.bg, color: COLORS.urgent.col, fontWeight: 700 }}>D-{diff} · {mmdd}</span>;
  if (diff <= 7)  return <span className={cls} style={{ background: COLORS.soon.bg, color: COLORS.soon.col }}>D-{diff} · {mmdd}</span>;
  return <span className={cls} style={{ background: COLORS.distant.bg, color: COLORS.distant.col }}>D-{diff} · {mmdd}</span>;
}

// 다른 일정 컬럼용 간단 표기
function fmtDate(d: string | null, textColor?: string) {
  const t = parseLocalDate(d);
  if (t === null) return <span style={{ color: "#CBD5E0" }}>-</span>;
  const dt = new Date(t);
  return <span style={{ color: textColor ?? COLORS.metaText }}>{dt.getMonth() + 1}/{dt.getDate()}</span>;
}

// v1 nextDate 로직을 v2 상태값에 맞게 이식
function nextMilestone(job: Job): { label: string; date: string } | null {
  const s = job.status;
  const { doc_announcement_date: da, written_exam_date: w, interview_date: i1, interview_date_2: i2, announcement_date: a, application_end: ae } = job;

  if (s === "applied") {
    if (da) return { label: "서류발표", date: da };
    if (w)  return { label: "필기", date: w };
    if (a)  return { label: "발표", date: a };
  }
  if (s === "doc_pass" || s === "written_wait") {
    if (w)  return { label: "필기", date: w };
    if (i1) return { label: "면접1차", date: i1 };
    if (a)  return { label: "발표", date: a };
  }
  if (s === "written_pass" || s === "interview_wait") {
    if (i1) return { label: "면접1차", date: i1 };
    if (i2) return { label: "면접2차", date: i2 };
    if (a)  return { label: "발표", date: a };
  }
  if (s === "interview_pass") {
    if (i2) return { label: "면접2차", date: i2 };
    if (a)  return { label: "최종발표", date: a };
  }
  if (s === "collected" || s === "monitoring" || s === "check_needed" || s === "available") {
    if (ae) return { label: "서류마감", date: ae };
  }
  return null;
}

interface Props {
  jobs: Job[];
  onStatusChange?: (id: string, status: JobStatus) => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

function Row({ job, onStatusChange, onToast }: { job: Job; onStatusChange?: Props["onStatusChange"]; onToast?: Props["onToast"] }) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [saving, setSaving] = useState(false);

  const isPass = PASS_STATUSES.has(status);
  const isFail = FAIL_STATUSES.has(status);
  const isApplied = APPLIED_STATUSES.has(status);
  const isMonitoring = MONITORING_STATUSES.has(status);
  const isWithdrawn = WITHDRAWN_STATUSES.has(status);
  const borderColor = FIT_BORDER[job.fit ?? 0] ?? COLORS.starEmpty;

  const rowStyle: React.CSSProperties = isPass
    ? { background: COLORS.passBg, color: COLORS.passText }
    : isFail
    ? { background: COLORS.failBg, color: COLORS.failText, opacity: 0.65 }
    : isApplied
    ? { background: COLORS.appliedBg, color: COLORS.appliedText }
    : isMonitoring
    ? { background: COLORS.monitoringBg, color: COLORS.monitoringText, fontWeight: 500 }
    : isWithdrawn
    ? { background: COLORS.withdrawnBg, color: COLORS.withdrawnText, opacity: 0.6 }
    : {};
  const hasRowColor = isPass || isFail || isApplied || isMonitoring || isWithdrawn;
  const hoverCls = !hasRowColor ? "hover:bg-indigo-50/40" : "";
  const textColor = isPass ? COLORS.passText : isFail ? COLORS.failText : isApplied ? COLORS.appliedText : isMonitoring ? COLORS.monitoringText : isWithdrawn ? COLORS.withdrawnText : undefined;
  const dateTextColor = textColor ?? COLORS.metaText;

  const next = nextMilestone(job);

  async function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const nextStatus = e.target.value as JobStatus;
    setSaving(true);
    const { error } = await supabase.from("jobs").update({ status: nextStatus }).eq("id", job.id);
    if (!error) {
      setStatus(nextStatus);
      onStatusChange?.(job.id, nextStatus);
      onToast?.(`${STATUS_LABELS[nextStatus]}(으)로 변경`, "success");
    } else {
      onToast?.("상태 변경 실패: " + error.message, "error");
    }
    setSaving(false);
  }

  return (
    <tr
      className={`border-b transition-colors group ${hoverCls}`}
      style={{ ...rowStyle, borderColor: "#EDF2F7" }}
    >
      {/* 기관명 - 왼쪽 보더로 적합도 색 표시 */}
      <td className="py-2.5 pl-3 pr-2 whitespace-nowrap" style={{ borderLeft: `4px solid ${borderColor}` }}>
        <Link
          href={`/jobs/${job.id}`}
          className="text-xs font-medium hover:underline"
          style={{ color: textColor ?? COLORS.bodyText }}
        >
          {job.organization ?? "-"}
        </Link>
      </td>

      {/* 적합도 */}
      <td className="py-2.5 px-2 text-center whitespace-nowrap">
        <FitStars fit={job.fit} reason={job.fit_reason} />
      </td>

      {/* 직무 */}
      <td className="py-2.5 px-2 whitespace-nowrap hidden md:table-cell">
        <span className="text-xs" style={{ color: textColor ?? COLORS.metaText }}>{job.duty ?? "-"}</span>
      </td>

      {/* 유형 */}
      <td className="py-2.5 px-2 whitespace-nowrap hidden lg:table-cell">
        <span className="text-xs" style={{ color: textColor ?? COLORS.metaText }}>{job.employment_type ?? "-"}</span>
      </td>

      {/* 지역 */}
      <td className="py-2.5 px-2 whitespace-nowrap hidden md:table-cell">
        <span className="text-xs" style={{ color: textColor ?? COLORS.metaText }}>{job.work_location ?? "-"}</span>
      </td>

      {/* 다음 관문 */}
      <td className="py-2.5 px-2 text-center whitespace-nowrap">
        {next ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold" style={{ color: textColor ?? "#4A5568" }}>{next.label}</span>
            <DeadlinePill date={next.date} status={status} compact />
          </div>
        ) : (
          <span style={{ color: "#CBD5E0" }} className="text-xs">-</span>
        )}
      </td>

      {/* 서류마감 (pill) */}
      <td className="py-2.5 px-2 text-center whitespace-nowrap">
        <DeadlinePill date={job.application_end} status={status} compact />
      </td>

      {/* 서류발표 */}
      <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap hidden lg:table-cell">{fmtDate(job.doc_announcement_date, dateTextColor)}</td>

      {/* 필기 */}
      <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap hidden lg:table-cell">{fmtDate(job.written_exam_date, dateTextColor)}</td>

      {/* 면접1 */}
      <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap hidden xl:table-cell">{fmtDate(job.interview_date, dateTextColor)}</td>

      {/* 면접2 */}
      <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap hidden xl:table-cell">{fmtDate(job.interview_date_2, dateTextColor)}</td>

      {/* 최종발표 */}
      <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap hidden xl:table-cell">{fmtDate(job.announcement_date, dateTextColor)}</td>

      {/* 상태 드롭다운 */}
      <td className="py-2.5 pl-2 pr-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <select
          value={status}
          onChange={handleStatus}
          disabled={saving}
          aria-label={`${job.organization} 상태 변경`}
          className={`text-xs rounded-lg px-2 py-1 border-0 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${STATUS_COLORS[status]} ${saving ? "opacity-50" : ""}`}
        >
          {STATUSES.map(([val, label]) => (
            <option key={val} value={val} className="bg-white text-gray-900 font-normal">
              {label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

export default function JobTable({ jobs, onStatusChange, onToast }: Props) {
  const headers = [
    { label: "기관명",     cls: "pl-3 pr-2 text-left",   responsive: "" },
    { label: "적합도",     cls: "px-2 text-center",      responsive: "" },
    { label: "직무",       cls: "px-2 text-left",        responsive: "hidden md:table-cell" },
    { label: "유형",       cls: "px-2 text-left",        responsive: "hidden lg:table-cell" },
    { label: "지역",       cls: "px-2 text-left",        responsive: "hidden md:table-cell" },
    { label: "다음 관문",  cls: "px-2 text-center",      responsive: "" },
    { label: "서류마감",   cls: "px-2 text-center",      responsive: "" },
    { label: "서류발표",   cls: "px-2 text-center",      responsive: "hidden lg:table-cell" },
    { label: "필기",       cls: "px-2 text-center",      responsive: "hidden lg:table-cell" },
    { label: "면접1차",    cls: "px-2 text-center",      responsive: "hidden xl:table-cell" },
    { label: "면접2차",    cls: "px-2 text-center",      responsive: "hidden xl:table-cell" },
    { label: "최종발표",   cls: "px-2 text-center",      responsive: "hidden xl:table-cell" },
    { label: "상태",       cls: "pl-2 pr-3 text-left",   responsive: "" },
  ];

  return (
    <div
      className="overflow-x-auto rounded-xl bg-white"
      style={{
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <table className="w-full min-w-[480px]">
        <thead>
          <tr style={{ background: COLORS.headerBg, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            {headers.map((h) => (
              <th
                key={h.label}
                className={`py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${h.cls} ${h.responsive}`}
                style={{ color: COLORS.headerText }}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <Row key={job.id} job={job} onStatusChange={onStatusChange} onToast={onToast} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
