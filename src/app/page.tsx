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
];

const DAY_MS = 86_400_000;
const TODAY = new Date().setHours(0, 0, 0, 0);
const DEFAULT_MIN = TODAY - 30 * DAY_MS;
const DEFAULT_MAX = TODAY + 180 * DAY_MS;

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState<"deadline" | "created">("deadline");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dateFilterOn, setDateFilterOn] = useState(false);
  const [rangeStart, setRangeStart] = useState(DEFAULT_MIN);
  const [rangeEnd, setRangeEnd] = useState(DEFAULT_MAX);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order(sort === "deadline" ? "application_end" : "created_at", {
          ascending: sort === "deadline",
          nullsFirst: false,
        });
      if (error) {
        console.error("Supabase error:", error);
        setFetchError(error.message);
      } else if (data) {
        const jobs = data as Job[];
        setJobs(jobs);

        // 슬라이더 초기 범위를 데이터 기준으로 설정
        const ts = jobs
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
  }, [sort]);

  function handleStatusChange(id: string, status: JobStatus) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  }

  // 슬라이더용 전체 범위 (데이터 기반)
  const [sliderMin, sliderMax] = useMemo(() => {
    const ts = jobs
      .filter((j) => j.application_end)
      .map((j) => new Date(j.application_end!).getTime());
    if (ts.length === 0) return [DEFAULT_MIN, DEFAULT_MAX];
    return [Math.min(...ts), Math.max(...ts)];
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    if (dateFilterOn) {
      list = list.filter((j) => {
        if (!j.application_end) return false;
        const t = new Date(j.application_end).getTime();
        return t >= rangeStart && t <= rangeEnd;
      });
    }
    return list;
  }, [jobs, filter, dateFilterOn, rangeStart, rangeEnd]);

  const stats: Record<string, number> = {};
  for (const j of jobs) {
    stats[j.status] = (stats[j.status] ?? 0) + 1;
  }

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
          onChange={(e) => setSort(e.target.value as "deadline" | "created")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="deadline">마감일순</option>
          <option value="created">등록순</option>
        </select>
      </div>

      {/* 기간 필터 슬라이더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
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
