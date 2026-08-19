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
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ymKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// 하루치 일정 전체를 보여주는 팝오버 (더보기 클릭 시)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E2E8F0" }}>
          <span className="text-base font-bold text-gray-800">{m}월 {d}일 일정 ({events.length}건)</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1" aria-label="닫기">×</button>
        </div>
        <div className="p-3 space-y-1.5">
          {events.map((ev, i) => (
            <Link
              key={i}
              href={`/jobs/${ev.job.id}`}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:opacity-80 text-sm"
              style={{ background: EVENT_DEFS[ev.type].bg, color: EVENT_DEFS[ev.type].col }}
            >
              <span className="font-semibold shrink-0 text-xs px-1.5 py-0.5 rounded bg-white/60">{EVENT_LABELS_FULL[ev.type]}</span>
              <span className="truncate font-medium">{ev.job.organization ?? "-"}</span>
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
        arr.push({ type, job });
        map.set(key, arr);
      }
    }
    return map;
  }, [jobs]);

  const todayKey = useMemo(() => ymKey(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { key: string; day: number | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ key: `pad-start-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: ymKey(year, month, d), day: d });
  while (cells.length % 7 !== 0) cells.push({ key: `pad-end-${cells.length}`, day: null });

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
        <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
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
              if (c.day === null) return <div key={c.key} className="bg-white min-h-[64px]" />;
              const events = eventsByDate.get(c.key) ?? [];
              const isToday = c.key === todayKey;
              return (
                <div
                  key={c.key}
                  className="bg-white min-h-[64px] p-1"
                  style={isToday ? { boxShadow: "inset 0 0 0 2px #4F46E5" } : undefined}
                >
                  <div
                    className={`text-xs leading-none mb-0.5 ${isToday ? "font-bold" : "text-gray-500"}`}
                    style={isToday ? { color: "#4F46E5" } : undefined}
                  >
                    {c.day}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((ev, i) => (
                      <Link
                        key={i}
                        href={`/jobs/${ev.job.id}`}
                        title={`${ev.job.organization ?? ""} · ${EVENT_LABELS_FULL[ev.type]}`}
                        className="flex items-center gap-0.5 truncate text-[11px] px-1 rounded leading-[16px]"
                        style={{ background: EVENT_DEFS[ev.type].bg, color: EVENT_DEFS[ev.type].col }}
                      >
                        <span className="font-semibold shrink-0">{EVENT_DEFS[ev.type].label}</span>
                        <span className="truncate">{ev.job.organization ?? "-"}</span>
                      </Link>
                    ))}
                    {events.length > 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedDate(c.key); }}
                        className="w-full text-left text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline px-1 leading-none font-medium"
                      >
                        +{events.length - 2}건 더보기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
