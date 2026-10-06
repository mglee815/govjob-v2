"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Job, JobStatus } from "@/lib/types";

type EventType = "app_start" | "app_end" | "doc_announce" | "written" | "interview1" | "interview2" | "final";

const EVENT_DEFS: Record<EventType, { label: string; bg: string; col: string }> = {
  app_start:    { label: "접수", bg: "#EEF2FF", col: "#4338CA" },
  app_end:      { label: "마감", bg: "#FCEBEB", col: "#A32D2D" },
  doc_announce: { label: "서류발표", bg: "#E6F1FB", col: "#0C447C" },
  written:      { label: "필기", bg: "#FAEEDA", col: "#633806" },
  interview1:   { label: "면접1", bg: "#F3E8FF", col: "#6B21A8" },
  interview2:   { label: "면접2", bg: "#FCE7F3", col: "#9D174D" },
  final:        { label: "최종발표", bg: "#DCFCE7", col: "#15803D" },
};

const EVENT_LABELS_FULL: Record<EventType, string> = {
  app_start: "접수시작",
  app_end: "서류마감",
  doc_announce: "서류발표",
  written: "필기시험",
  interview1: "면접1차",
  interview2: "면접2차",
  final: "최종발표",
};

const FIELD_MAP: [keyof Job, EventType][] = [
  ["application_start", "app_start"],
  ["application_end", "app_end"],
  ["doc_announcement_date", "doc_announce"],
  ["written_exam_date", "written"],
  ["interview_date", "interview1"],
  ["interview_date_2", "interview2"],
  ["announcement_date", "final"],
];

// 더 이상 챙길 일정이 아닌 건(불합격·패스·마감 등)은 캘린더에서 제외
const EXCLUDED_STATUSES: JobStatus[] = ["doc_fail", "written_fail", "interview_fail", "withdrawn", "expired"];

interface CalEvent {
  type: EventType;
  job: Job;
  time?: string | null;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 같은 날 여러 일정이 겹칠 때 보여줄 순서: 마감(놓치면 치명적) → 필기 → 면접 → 발표 → 접수시작
const EVENT_PRIORITY: Record<EventType, number> = {
  app_end: 0,
  written: 1,
  interview1: 2,
  interview2: 3,
  doc_announce: 4,
  final: 5,
  app_start: 6,
};

function ymKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weekdayOf(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// 하루치 일정 전체를 보여주는 시트 (날짜 칸을 누르면 열림. 모바일에서는 아래에서 올라오는 시트)
function DayDetail({
  dateKey,
  events,
  onClose,
}: {
  dateKey: string;
  events: CalEvent[];
  onClose: () => void;
}) {
  const [, m, d] = dateKey.split("-").map(Number);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E2E8F0" }}>
          <span className="text-base font-bold text-gray-800">
            {m}월 {d}일 ({weekdayOf(dateKey)}) · {events.length}건
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2 py-1" aria-label="닫기">×</button>
        </div>
        <div className="p-3 space-y-2 pb-6 md:pb-3">
          {events.map((ev, i) => (
            <Link
              key={i}
              href={`/jobs/${ev.job.id}`}
              className="block px-3 py-2.5 rounded-lg hover:opacity-80 text-sm"
              style={{ background: EVENT_DEFS[ev.type].bg, color: EVENT_DEFS[ev.type].col }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold shrink-0 text-xs px-1.5 py-0.5 rounded bg-white/60">
                  {EVENT_LABELS_FULL[ev.type]}{ev.time ? ` ${ev.time}` : ""}
                </span>
                <span className="font-semibold break-words min-w-0">{ev.job.organization ?? "-"}</span>
              </div>
              {ev.type === "written" && ev.job.written_exam_subjects && (
                <p className="text-xs mt-1 opacity-80 leading-snug">📝 {ev.job.written_exam_subjects}</p>
              )}
              {ev.job.duty && <p className="text-xs mt-0.5 opacity-70 leading-snug line-clamp-1">{ev.job.duty}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ScheduleCalendar({ jobs }: { jobs: Job[] }) {
  // 서버가 정적으로 캐싱한 HTML에는 캐시 생성 시점(UTC)의 "오늘"이 굳어서 박혀있을 수 있으므로,
  // 마운트 직후 브라우저의 실제 로컬 시각으로 한 번 더 갱신해 오늘 표시가 항상 정확하게 함
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
  }, []);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [collapsed, setCollapsed] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // 모바일에서 캘린더를 접어두면 목록이 바로 보이므로, 접힘 상태를 기억해 둠
  useEffect(() => {
    try {
      if (localStorage.getItem("govjob.calendarCollapsed") === "1") setCollapsed(true);
    } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed((v) => {
      try { localStorage.setItem("govjob.calendarCollapsed", v ? "0" : "1"); } catch {}
      return !v;
    });
  }

  // 모든 공고의 일정을 날짜별로 모아둠 (탈락/패스/마감 건 제외, 필터와 무관하게 항상 전체 기준)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const job of jobs) {
      if (EXCLUDED_STATUSES.includes(job.status)) continue;
      for (const [field, type] of FIELD_MAP) {
        const v = job[field] as string | null;
        if (!v) continue;
        const key = v.slice(0, 10);
        const arr = map.get(key) ?? [];
        arr.push({ type, job, time: type === "app_end" ? job.application_end_time : null });
        map.set(key, arr);
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type]);
    return map;
  }, [jobs]);

  const todayKey = useMemo(() => ymKey(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  // "다가오는 일정" 목록 (오늘부터 앞으로 10건)
  const upcoming = useMemo(() => {
    const out: { key: string; ev: CalEvent }[] = [];
    const keys = Array.from(eventsByDate.keys()).filter((k) => k >= todayKey).sort();
    for (const key of keys) {
      for (const ev of eventsByDate.get(key)!) {
        // 필기시험과 서류마감(놓치면 안 되는 일정)만 보여줌. 서류발표·면접·최종발표는 캘린더/표에서 확인
        if (ev.type !== "written" && ev.type !== "app_end") continue;
        out.push({ key, ev });
        if (out.length >= 10) return out;
      }
    }
    return out;
  }, [eventsByDate, todayKey]);

  function ddayLabel(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
    return diff === 0 ? "오늘" : `D-${diff}`;
  }

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 이전/다음 달의 날짜도 옅은 회색으로 채워서, 이번 달에 안 잡혀서 못 보고 지나치는 마감이 없게 함
  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthDays = prevMonthLastDay.getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({ key: ymKey(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), d), day: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: ymKey(year, month, d), day: d, inMonth: true });
  const nextMonthFirstDay = new Date(year, month + 1, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ key: ymKey(nextMonthFirstDay.getFullYear(), nextMonthFirstDay.getMonth(), nextDay), day: nextDay, inMonth: false });
    nextDay++;
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const monthEventCount = useMemo(() => {
    let n = 0;
    for (const [key, evs] of eventsByDate) {
      const [y, m] = key.split("-").map(Number);
      if (y === year && m === month + 1) n += evs.length;
    }
    return n;
  }, [eventsByDate, year, month]);

  return (
    <div className="rounded-xl bg-white" style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b flex-wrap gap-1.5" style={{ borderColor: "#E2E8F0" }}>
        <button onClick={toggleCollapsed} className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
          <span>📅 내 일정</span>
          <span className="text-xs font-normal text-gray-400">{monthEventCount}건</span>
          <span className="text-xs text-gray-400">{collapsed ? "▸" : "▾"}</span>
        </button>
        {!collapsed && (
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-500 text-sm" aria-label="이전 달">◀</button>
            <span className="text-sm font-semibold text-gray-700 min-w-[76px] text-center">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-500 text-sm" aria-label="다음 달">▶</button>
            <button onClick={goToday} className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-600">오늘</button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-2">
          {/* 범례 */}
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 mb-2 px-1">
            {(Object.keys(EVENT_DEFS) as EventType[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs" style={{ color: EVENT_DEFS[t].col }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: EVENT_DEFS[t].col }} />
                {EVENT_LABELS_FULL[t]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg" style={{ background: "#EDF2F7" }}>
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className="bg-white text-center text-xs font-semibold py-1.5"
                style={{ color: i === 0 ? "#A32D2D" : i === 6 ? "#0C447C" : "#718096" }}
              >
                {w}
              </div>
            ))}
            {cells.map((c) => {
              const events = eventsByDate.get(c.key) ?? [];
              const isToday = c.key === todayKey;
              const hasEvents = events.length > 0;
              return (
                <div
                  key={c.key}
                  role={hasEvents ? "button" : undefined}
                  tabIndex={hasEvents ? 0 : undefined}
                  aria-label={hasEvents ? `${c.key} 일정 ${events.length}건 보기` : undefined}
                  onClick={hasEvents ? () => setExpandedDate(c.key) : undefined}
                  onKeyDown={hasEvents ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedDate(c.key); } } : undefined}
                  className={`bg-white min-h-[52px] md:min-h-[64px] p-1 ${hasEvents ? "cursor-pointer hover:bg-indigo-50/50 active:bg-indigo-50" : ""}`}
                  style={isToday ? { boxShadow: "inset 0 0 0 2px #4F46E5" } : undefined}
                >
                  <div
                    className={`text-xs leading-none mb-0.5 ${isToday ? "font-bold" : c.inMonth ? "text-gray-500" : "text-gray-300"}`}
                    style={isToday ? { color: "#4F46E5" } : undefined}
                  >
                    {c.day}
                  </div>

                  {/* 모바일: 칸이 좁아 글씨가 안 읽히므로 일정 종류별 색 점으로 표시 (누르면 그날 전체 일정이 열림) */}
                  {hasEvents && (
                    <div className="md:hidden flex flex-wrap gap-[3px] mt-1.5 px-0.5">
                      {events.slice(0, 6).map((ev, i) => (
                        <span key={i} className="w-2 h-2 rounded-full inline-block" style={{ background: EVENT_DEFS[ev.type].col }} />
                      ))}
                    </div>
                  )}

                  {/* 데스크톱: 칩 2개 + 더보기. 칩을 눌러도 첫 번째 기관으로 바로 가지 않고, 그날 전체 일정이 열림 */}
                  <div className="hidden md:block space-y-0.5">
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        title={`${ev.job.organization ?? ""} · ${EVENT_LABELS_FULL[ev.type]}${ev.time ? ` ${ev.time}` : ""}`}
                        className="flex items-center gap-0.5 truncate text-[11px] px-1 rounded leading-[16px]"
                        style={{ background: EVENT_DEFS[ev.type].bg, color: EVENT_DEFS[ev.type].col }}
                      >
                        <span className="font-semibold shrink-0">{EVENT_DEFS[ev.type].label}{ev.time ? ` ${ev.time}` : ""}</span>
                        <span className="truncate">{ev.job.organization ?? "-"}</span>
                      </div>
                    ))}
                    {events.length > 2 && (
                      <span className="block text-[11px] text-indigo-500 px-1 leading-none font-medium">
                        +{events.length - 2}건 더보기
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 다가오는 일정 목록 (캘린더를 안 눌러도 가까운 시험·마감과 시험과목을 바로 확인) */}
          {upcoming.length > 0 && (
            <div className="mt-3 pt-2 border-t" style={{ borderColor: "#EDF2F7" }}>
              <p className="text-xs font-semibold px-1 mb-1" style={{ color: "#718096" }}>다가오는 일정</p>
              <ul>
                {upcoming.map(({ key, ev }, i) => {
                  const [, m, d] = key.split("-").map(Number);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => setExpandedDate(key)}
                        className="w-full py-2 px-1 text-left hover:bg-gray-50 active:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-[62px] shrink-0 text-xs text-gray-500">{m}/{d}({weekdayOf(key)})</span>
                          <span
                            className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: EVENT_DEFS[ev.type].bg, color: EVENT_DEFS[ev.type].col }}
                          >
                            {EVENT_DEFS[ev.type].label}{ev.time ? ` ${ev.time}` : ""}
                          </span>
                          <span className="truncate text-sm text-gray-800 min-w-0">{ev.job.organization ?? "-"}</span>
                          <span className="ml-auto shrink-0 text-[11px] text-gray-400">{ddayLabel(key)}</span>
                        </div>
                        {ev.type === "written" && ev.job.written_exam_subjects && (
                          <p className="text-[11px] leading-snug mt-1 pl-[70px]" style={{ color: "#633806" }}>
                            📝 {ev.job.written_exam_subjects}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {expandedDate && (
        <DayDetail
          dateKey={expandedDate}
          events={eventsByDate.get(expandedDate) ?? []}
          onClose={() => setExpandedDate(null)}
        />
      )}
    </div>
  );
}
