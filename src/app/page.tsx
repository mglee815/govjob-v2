"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobStatus, STATUS_LABELS } from "@/lib/types";
import JobCard from "@/components/JobCard";
import DateRangeSlider from "@/components/DateRangeSlider";

const KPI_STATUSES: JobStatus[] = ["applied", "doc_pass", "written_pass", "interview_pass"];

const KPI_COLORS: Record<string, string> = {
  applied:        "border-indigo-200 hover:border-indigo-400",
  doc_pass:       "border-yellow-200 hover:border-yellow-400",
  written_pass:   "border-orange-200 hover:border-orange-400",
  interview_pass: "border-purple-200 hover:border-purple-400",
};

const KPI_NUMBER_COLORS: Record<string, string> = {
  applied:        "text-indigo-600",
  doc_pass:       "text-yellow-600",
  written_pass:   "text-orange-600",
  interview_pass: "text-purple-600",
};

const FILTER_OPTIONS: { label: string; value: JobStatus | "all" }[] = [
  { label: "전체",   value: "all" },
  { label: "관심",   value: "bookmarked" },
  { label: "지원예정", value: "planning" },
  { label: "지원완료", value: "applied" },
  { label: "서류합격", value: "doc_pass" },
  { label: "필기대기", value: "written_wait" },
  { label: "필기합격", value: "written_pass" },
  { label: "면접대기", value: "interview_wait" },
  { label: "면접합격", value: "interview_pass" },
  { label: "최종합격", value: "final_pass" },
  { label: "불합격",  value: "failed" },
  { label: "포기",   value: "withdrawn" },
];

type SortKey = "deadline_asc" | "deadline_desc" | "deadline_near" | "created_desc";

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "마감임박순",        value: "deadline_near" },
  { label: "서류마감 오름차순", value: "deadline_asc" },
  { label: "서류마감 내림차순", value: "deadline_desc" },
  { label: "등록일순",         value: "created_desc" },
];

const TODAY = new Date().setHours(0, 0, 0, 0);
const DAY_MS = 86_400_000;

function sortJobs(jobs: Job[], key: SortKey): Job[] {
  const copy = [...jobs];
  const ts = (j: Job) =>
    j.application_end ? new Date(j.application_end).getTime() : null;

  switch (key) {
    case "deadline_asc":
      return copy.sort((a, b) => {
        const ta = ts(a) ?? Infinity;
        const tb = ts(b) ?? Infinity;
        return ta - tb;
      });
    case "deadline_desc":
      return copy.sort((a, b) => {
        const ta = ts(a) ?? -Infinity;
        const tb = ts(b) ?? -Infinity;
        return tb - ta;
      });
    case "deadline_near":
      // 미래 마감일: 가까운 순 → 과거/없음: 마지막
      return copy.sort((a, b) => {
        const ta = ts(a);
        const tb = ts(b);
        const futureA = ta !== null && ta >= TODAY;
        const futureB = tb !== null && tb >= TODAY;
        if (futureA && futureB) return ta! - tb!;
        if (futureA) return -1;
        if (futureB) return 1;
        return (ta ?? 0) - (tb ?? 0);
      });
    case "created_desc":
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("deadline_near");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 기간 필터
  const [dateFilterOn, setDateFilterOn] = useState(false);
  const [rangeStart, setRangeStart] = useState(TODAY);
  const [rangeEnd, setRangeEnd] = useState(TODAY + 180 * DAY_MS);

  // 지원가능 필터
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase.from("jobs").select("*");
      if (error) {
        console.error("Supabase error:", error);
        setFetchError(error.message);
      } else if (data) {
        const list = data as Job[];
        setJobs(list);
        // 슬라이더 초기 범위: 데이터의 실제 마감일 범위
        const ts = list
          .filter((j) => j.application_end)
          .map((j) => new Date(j.application_end!).getTime());
        if (ts.length > 0) {
          setRangeStart(Math.min(...ts));
          setRangeEnd(Math.max(...ts));
        }
      }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  function handleStatusChange(id: string, status: JobStatus) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  }

  const sliderMin = useMemo(() => {
    const ts = jobs.filter((j) => j.application_end).map((j) => new Date(j.application_end!).getTime());
    return ts.length ? Math.min(...ts) : TODAY - 30 * DAY_MS;
  }, [jobs]);

  const sliderMax = useMemo(() => {
    const ts = jobs.filter((j) => j.application_end).map((j) => new Date(j.application_end!).getTime());
    return ts.length ? Math.max(...ts) : TODAY + 180 * DAY_MS;
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    if (availableOnly) {
      list = list.filter((j) => j.application_end && new Date(j.application_end).getTime() >= TODAY);
    }
    if (dateFilterOn) {
      list = list.filter((j) => {
        if (!j.application_end) return false;
        const t = new Date(j.application_end).getTime();
        return t >= rangeStart && t <= rangeEnd;
      });
    }
    return sortJobs(list, sort);
  }, [jobs, filter, availableOnly, dateFilterOn, rangeStart, rangeEnd, sort]);

  const stats: Record<string, number> = {};
  for (const j of jobs) stats[j.status] = (stats[j.status] ?? 0) + 1;

  const availableCount = jobs.filter(
    (j) => j.application_end && new Date(j.application_end).getTime() >= TODAY
  ).length;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KPI_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={`bg-white border-2 rounded-xl p-4 text-center transition-all ${KPI_COLORS[s]} ${
              filter === s ? "ring-2 ring-offset-1 ring-indigo-400 shadow-md" : ""
            }`}
          >
            <p className={`text-2xl font-bold ${KPI_NUMBER_COLORS[s]}`}>{stats[s] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* 필터 & 정렬 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
              {opt.value !== "all" && stats[opt.value]
                ? ` (${stats[opt.value]})`
                : ""}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* 빠른 필터: 지원가능 + 기간 필터 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
        {/* 지원가능 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">지원가능 공고만</span>
            <span className="ml-2 text-xs text-gray-400">서류마감이 오늘 이후인 공고</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-600 font-medium">{availableCount}개</span>
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                availableOnly ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                  availableOnly ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-100" />

        {/* 기간 필터 슬라이더 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">서류마감일 기간 필터</span>
            <button
              onClick={() => setDateFilterOn((v) => !v)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                dateFilterOn ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                  dateFilterOn ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <div className={dateFilterOn ? "" : "opacity-40 pointer-events-none"}>
            {sliderMin < sliderMax && (
              <DateRangeSlider
                min={sliderMin}
                max={sliderMax}
                start={rangeStart}
                end={rangeEnd}
                onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
              />
            )}
          </div>
          {dateFilterOn && (
            <p className="text-xs text-indigo-600 mt-2 text-right">
              {filtered.length}개 공고 표시 중
            </p>
          )}
        </div>
      </div>

      {/* 공고 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : fetchError ? (
        <div className="text-center py-20 text-red-500">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-medium">Supabase 연결 오류</p>
          <p className="text-sm mt-2 text-red-400">{fetchError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>조건에 맞는 공고가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </main>
  );
}
