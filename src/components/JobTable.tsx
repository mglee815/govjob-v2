"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import Link from "next/link";
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { daysFromToday, parseLocalDate } from "@/lib/dates";
import { SortField, SortDir } from "@/lib/sort";

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];

const ORG_COL_WIDTH = 200;
const STATUS_COL_WIDTH = 78;

// v1 Oa 색상 맵 (fit 점수별 왼쪽 보더 색)
const FIT_BORDER: Record<number, string> = {
  5: "#48BB78",
  4: "#4299E1",
  3: "#ECC94B",
  2: "#ED8936",
  1: "#A0AEC0",
  0: "#E2E8F0",
};

const COLORS = {
  star: "#BA7517",
  starEmpty: "#E2E8F0",
  cardBorder: "#E2E8F0",
  headerBg: "#F7FAFC",
  headerText: "#718096",
  bodyText: "#111827",
  metaText: "#374151",
  rowEven: "#FFFFFF",
  rowOdd: "#FAFAFA",
  // 마감일 pill (v1 Sa() 함수와 동일한 구간·색상)
  ongoing: { bg: "#E1F5EE", col: "#085041" },       // 상시
  undecided: { bg: "#F1EFE8", col: "#5F5E5A" },      // 미정
  closed: { bg: "#F1EFE8", col: "#777770" },         // 마감
  urgent: { bg: "#FCEBEB", col: "#A32D2D" },         // 오늘 · D-5 이내
  soon: { bg: "#FAEEDA", col: "#633806" },           // D-6~14
  distant: { bg: "#E6F1FB", col: "#0C447C" },        // D-15 이상
};

// 공고를 상태별로 그룹핑 (접수중을 최우선으로 두어 마감 임박한 것부터 챙길 수 있게)
const GROUP_DEFS: { key: string; label: string; statuses: JobStatus[]; accent: string }[] = [
  { key: "available",      label: "접수중",              statuses: ["available"], accent: "#2B6CB0" },
  { key: "in_progress",    label: "서류제출 · 필기응시",   statuses: ["applied", "written_wait"], accent: "#4338CA" },
  { key: "passing",        label: "합격 진행중",          statuses: ["written_pass", "interview_wait", "interview_pass", "final_pass"], accent: "#15803D" },
  { key: "monitoring",     label: "모니터링",            statuses: ["monitoring"], accent: "#4A5568" },
  { key: "doc_fail",       label: "서류불합격",           statuses: ["doc_fail"], accent: "#A32D2D" },
  { key: "written_fail",   label: "필기불합격",           statuses: ["written_fail"], accent: "#BE185D" },
  { key: "interview_fail", label: "면접불합격",           statuses: ["interview_fail"], accent: "#9F1239" },
  { key: "withdrawn",      label: "패스(미지원)",         statuses: ["withdrawn"], accent: "#9CA3AF" },
  { key: "expired",        label: "마감(미지원)",         statuses: ["expired"], accent: "#9CA3AF" },
];

// v1 style 별점
function FitStars({ fit, reason }: { fit: number | null; reason: string | null }) {
  const n = fit ?? 0;
  if (n === 0) return <span className="text-sm" style={{ color: "#A0AEC0" }}>-</span>;
  return (
    <span
      title={reason ?? ""}
      style={{
        color: COLORS.star,
        letterSpacing: -1,
        fontSize: 17,
        cursor: "help",
        whiteSpace: "nowrap",
      }}
    >
      {"★".repeat(n)}
      <span style={{ color: COLORS.starEmpty }}>{"☆".repeat(5 - n)}</span>
    </span>
  );
}

// v1 style pill: 서류마감 등에 사용
function DeadlinePill({
  date,
  compact,
}: {
  date: string | null;
  compact?: boolean;
}) {
  const pad = compact ? "px-1.5 py-[1px]" : "px-2 py-0.5";
  const cls = `inline-block ${pad} rounded text-xs font-medium whitespace-nowrap`;

  if (!date) {
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
  if (diff <= 5)  return <span className={cls} style={{ background: COLORS.urgent.bg, color: COLORS.urgent.col, fontWeight: 700 }}>D-{diff} · {mmdd}</span>;
  if (diff <= 14) return <span className={cls} style={{ background: COLORS.soon.bg, color: COLORS.soon.col }}>D-{diff} · {mmdd}</span>;
  return <span className={cls} style={{ background: COLORS.distant.bg, color: COLORS.distant.col }}>D-{diff} · {mmdd}</span>;
}

// 다른 일정 컬럼용 간단 표기
function fmtDate(d: string | null) {
  const t = parseLocalDate(d);
  if (t === null) return <span style={{ color: "#CBD5E0" }}>-</span>;
  const dt = new Date(t);
  return <span style={{ color: COLORS.metaText }}>{dt.getMonth() + 1}/{dt.getDate()}</span>;
}

// v1 nextDate 로직을 v2 상태값에 맞게 이식 (날짜는 옆 컬럼에 이미 나오므로 라벨 텍스트만 사용)
function nextMilestone(job: Job): string | null {
  const s = job.status;
  const { doc_announcement_date: da, written_exam_date: w, interview_date: i1, interview_date_2: i2, announcement_date: a, application_end: ae } = job;

  if (s === "applied") {
    if (da) return "서류발표";
    if (w)  return "필기";
    if (a)  return "발표";
  }
  if (s === "written_wait") {
    if (w)  return "필기";
    if (i1) return "면접1차";
    if (a)  return "발표";
  }
  if (s === "written_pass" || s === "interview_wait") {
    if (i1) return "면접1차";
    if (i2) return "면접2차";
    if (a)  return "발표";
  }
  if (s === "interview_pass") {
    if (i2) return "면접2차";
    if (a)  return "최종발표";
  }
  if (s === "monitoring" || s === "available") {
    if (ae) return "서류마감";
  }
  return null;
}

interface Props {
  jobs: Job[];
  onStatusChange?: (id: string, status: JobStatus) => void;
  onToast?: (msg: string, type: "success" | "error") => void;
  sortField?: SortField;
  sortDir?: SortDir;
  onSortChange?: (field: SortField, dir: SortDir) => void;
}

// 더블클릭하면 말줄임된 전체 텍스트를 펼쳐 보여주는 셀
function ExpandableCell({ text, widthClass }: { text: string | null; widthClass: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <span
      className={`text-sm block cursor-default ${expanded ? "whitespace-normal break-words" : `truncate ${widthClass}`}`}
      style={{ color: COLORS.metaText }}
      title={!expanded ? (text ?? undefined) : undefined}
      onDoubleClick={() => setExpanded((v) => !v)}
    >
      {text ?? "-"}
    </span>
  );
}

function Row({ job, zebra, onStatusChange, onToast }: { job: Job; zebra: boolean; onStatusChange?: Props["onStatusChange"]; onToast?: Props["onToast"] }) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [saving, setSaving] = useState(false);
  const [orgExpanded, setOrgExpanded] = useState(false);

  const borderColor = FIT_BORDER[job.fit ?? 0] ?? COLORS.starEmpty;
  const nextLabel = nextMilestone(job);
  const bg = zebra ? COLORS.rowOdd : COLORS.rowEven;

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
    <tr className="border-b hover:bg-indigo-50/40 transition-colors" style={{ borderColor: "#EDF2F7" }}>
      {/* 기관명 - 스크롤해도 항상 보이도록 고정, 왼쪽 보더로 적합도 색 표시 */}
      <td
        className="sticky left-0 z-10 py-1.5 pl-2 pr-1.5 whitespace-nowrap"
        style={{ borderLeft: `4px solid ${borderColor}`, width: ORG_COL_WIDTH, minWidth: ORG_COL_WIDTH, background: bg }}
        onDoubleClick={() => setOrgExpanded((v) => !v)}
      >
        <Link
          href={`/jobs/${job.id}`}
          title={!orgExpanded ? (job.organization ?? undefined) : undefined}
          className={`text-sm font-medium hover:underline block ${orgExpanded ? "whitespace-normal break-words" : "truncate"}`}
          style={{ color: COLORS.bodyText, maxWidth: orgExpanded ? undefined : ORG_COL_WIDTH - 18 }}
        >
          {job.organization ?? "-"}
        </Link>
      </td>

      {/* 상태 드롭다운 - 기관명 옆에 고정 */}
      <td
        className="sticky z-10 py-1.5 px-1 whitespace-nowrap"
        style={{ left: ORG_COL_WIDTH, width: STATUS_COL_WIDTH, minWidth: STATUS_COL_WIDTH, background: bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={status}
          onChange={handleStatus}
          disabled={saving}
          aria-label={`${job.organization} 상태 변경`}
          className={`w-full text-xs rounded-lg px-1 py-1 border-0 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${STATUS_COLORS[status]} ${saving ? "opacity-50" : ""}`}
        >
          {STATUSES.map(([val, label]) => (
            <option key={val} value={val} className="bg-white text-gray-900 font-normal">
              {label}
            </option>
          ))}
        </select>
      </td>

      {/* 이 지점부터는 배경이 지브라 패턴 (흰색/연회색) */}
      <td className="py-1.5 px-1.5 text-center whitespace-nowrap" style={{ background: bg }}>
        <FitStars fit={job.fit} reason={job.fit_reason} />
      </td>

      {/* 직무 */}
      <td className="py-1.5 px-1.5 hidden md:table-cell" style={{ background: bg }}>
        <ExpandableCell text={job.duty} widthClass="max-w-[64px]" />
      </td>

      {/* 유형 */}
      <td className="py-1.5 px-1.5 hidden lg:table-cell" style={{ background: bg }}>
        <ExpandableCell text={job.employment_type} widthClass="max-w-[64px]" />
      </td>

      {/* 지역 */}
      <td className="py-1.5 px-1.5 hidden md:table-cell" style={{ background: bg }}>
        <ExpandableCell text={job.work_location} widthClass="max-w-[64px]" />
      </td>

      {/* 다음 관문 (날짜는 옆 컬럼에 있으니 라벨만) */}
      <td className="py-1.5 px-1.5 text-center whitespace-nowrap" style={{ background: bg }}>
        {nextLabel ? (
          <span className="text-sm font-semibold" style={{ color: "#111827" }}>{nextLabel}</span>
        ) : (
          <span style={{ color: "#CBD5E0" }} className="text-sm">-</span>
        )}
      </td>

      {/* 서류마감 (pill) */}
      <td className="py-1.5 px-1.5 text-center whitespace-nowrap" style={{ background: bg }}>
        <DeadlinePill date={job.application_end} compact />
      </td>

      {/* 서류발표 */}
      <td className="py-1.5 px-1.5 text-center text-sm whitespace-nowrap hidden lg:table-cell" style={{ background: bg }}>{fmtDate(job.doc_announcement_date)}</td>

      {/* 필기 */}
      <td className="py-1.5 px-1.5 text-center text-sm whitespace-nowrap hidden lg:table-cell" style={{ background: bg }}>{fmtDate(job.written_exam_date)}</td>

      {/* 면접1 */}
      <td className="py-1.5 px-1.5 text-center text-sm whitespace-nowrap hidden xl:table-cell" style={{ background: bg }}>{fmtDate(job.interview_date)}</td>

      {/* 면접2 */}
      <td className="py-1.5 px-1.5 text-center text-sm whitespace-nowrap hidden xl:table-cell" style={{ background: bg }}>{fmtDate(job.interview_date_2)}</td>

      {/* 최종발표 */}
      <td className="py-1.5 pl-1.5 pr-2 text-center text-sm whitespace-nowrap hidden xl:table-cell" style={{ background: bg }}>{fmtDate(job.announcement_date)}</td>
    </tr>
  );
}

const COLSPAN = 13;

function GroupHeaderRow({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <tr>
      <td colSpan={COLSPAN} className="py-1.5 pl-2 pr-2" style={{ background: "#F7FAFC", borderBottom: `1px solid ${COLORS.cardBorder}`, borderTop: `1px solid ${COLORS.cardBorder}` }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: accent }} />
        <span className="text-sm font-bold tracking-wide" style={{ color: "#111827" }}>
          {label}
        </span>
        <span className="text-xs ml-1.5" style={{ color: COLORS.metaText }}>{count}건</span>
      </td>
    </tr>
  );
}

export default function JobTable({ jobs, onStatusChange, onToast, sortField, sortDir, onSortChange }: Props) {
  const headers: { label: string; cls: string; responsive: string; sortField?: SortField; sticky?: number }[] = [
    { label: "기관명",     cls: "pl-2 pr-1.5 text-left",   responsive: "", sortField: "organization", sticky: 0 },
    { label: "상태",       cls: "px-1 text-left",          responsive: "", sortField: "status", sticky: ORG_COL_WIDTH },
    { label: "적합도",     cls: "px-1.5 text-center",      responsive: "", sortField: "fit" },
    { label: "직무",       cls: "px-1.5 text-left",        responsive: "hidden md:table-cell" },
    { label: "유형",       cls: "px-1.5 text-left",        responsive: "hidden lg:table-cell", sortField: "employment_type" },
    { label: "지역",       cls: "px-1.5 text-left",        responsive: "hidden md:table-cell", sortField: "work_location" },
    { label: "다음 관문",  cls: "px-1.5 text-center",      responsive: "" },
    { label: "서류마감",   cls: "px-1.5 text-center",      responsive: "", sortField: "application_end" },
    { label: "서류발표",   cls: "px-1.5 text-center",      responsive: "hidden lg:table-cell", sortField: "doc_announcement_date" },
    { label: "필기",       cls: "px-1.5 text-center",      responsive: "hidden lg:table-cell", sortField: "written_exam_date" },
    { label: "면접1차",    cls: "px-1.5 text-center",      responsive: "hidden xl:table-cell", sortField: "interview_date" },
    { label: "면접2차",    cls: "px-1.5 text-center",      responsive: "hidden xl:table-cell", sortField: "interview_date_2" },
    { label: "최종발표",   cls: "pl-1.5 pr-2 text-center", responsive: "hidden xl:table-cell", sortField: "announcement_date" },
  ];

  // 헤더 클릭 한 번으로 오름차순/내림차순 토글 (같은 컬럼 재클릭 시 방향 반전)
  const handleHeaderClick = (field: SortField) => {
    if (!onSortChange) return;
    if (sortField === field) {
      onSortChange(field, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, field === "fit" ? "desc" : "asc");
    }
  };

  // 상단 보조 스크롤바: 아래 테이블과 스크롤 위치를 동기화해
  // 매번 아래까지 내려가지 않아도 가로 스크롤을 조작할 수 있게 함
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const bottom = bottomRef.current;
    const spacer = spacerRef.current;
    if (!bottom || !spacer) return;

    const updateWidth = () => {
      spacer.style.width = `${bottom.scrollWidth}px`;
    };
    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(bottom);
    return () => ro.disconnect();
  }, [jobs]);

  const handleTopScroll = useCallback(() => {
    if (syncing.current || !topRef.current || !bottomRef.current) return;
    syncing.current = true;
    bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  const handleBottomScroll = useCallback(() => {
    if (syncing.current || !topRef.current || !bottomRef.current) return;
    syncing.current = true;
    topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  // 상태별 그룹으로 나누되, 그룹 내부에서는 상위에서 이미 적용된 정렬 순서를 유지
  const groups = GROUP_DEFS.map((g) => ({
    ...g,
    jobs: jobs.filter((j) => g.statuses.includes(j.status)),
  })).filter((g) => g.jobs.length > 0);

  let rowIndex = 0;

  return (
    <div
      className="rounded-xl bg-white"
      style={{
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* 상단 보조 스크롤바 (필요할 때만 표시됨) */}
      <div
        ref={topRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto overflow-y-hidden rounded-t-xl"
        style={{ height: 10 }}
      >
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        onScroll={handleBottomScroll}
        className="overflow-x-auto"
      >
        <table className="w-full min-w-[420px]">
          <thead>
            <tr style={{ background: COLORS.headerBg, borderBottom: `1px solid ${COLORS.cardBorder}`, borderTop: `1px solid ${COLORS.cardBorder}` }}>
              {headers.map((h) => {
                const isSortable = !!h.sortField;
                const isActive = isSortable && sortField === h.sortField;
                const stickyStyle: React.CSSProperties = h.sticky !== undefined
                  ? { left: h.sticky, background: COLORS.headerBg }
                  : {};
                return (
                  <th
                    key={h.label}
                    className={`py-2 text-[13px] font-semibold uppercase tracking-wide whitespace-nowrap ${h.cls} ${h.responsive} ${isSortable ? "cursor-pointer select-none hover:text-indigo-600" : ""} ${h.sticky !== undefined ? "sticky z-20" : ""}`}
                    style={{ color: isActive ? "#4F46E5" : COLORS.headerText, ...stickyStyle }}
                    onClick={isSortable ? () => handleHeaderClick(h.sortField!) : undefined}
                  >
                    {h.label}
                    {isSortable && (
                      <span className="ml-0.5 text-[10px]">
                        {isActive ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key}>
                <GroupHeaderRow label={g.label} count={g.jobs.length} accent={g.accent} />
                {g.jobs.map((job) => {
                  const zebra = rowIndex % 2 === 1;
                  rowIndex += 1;
                  return (
                    <Row key={job.id} job={job} zebra={zebra} onStatusChange={onStatusChange} onToast={onToast} />
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
