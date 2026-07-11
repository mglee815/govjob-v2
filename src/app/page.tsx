"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobStatus, STATUS_LABELS } from "@/lib/types";
import { parseLocalDate, TODAY_MS } from "@/lib/dates";
import JobTable from "@/components/JobTable";
import Toast from "@/components/Toast";

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
  { label: "전체",        value: "all" },
  { label: "수집",        value: "collected" },
  { label: "모니터링",    value: "monitoring" },
  { label: "확인필요",    value: "check_needed" },
  { label: "접수중",      value: "available" },
  { label: "다음공고대기", value: "watching" },
  { label: "서류제출",    value: "applied" },
  { label: "서류합격",    value: "doc_pass" },
  { label: "서류불합격",  value: "doc_fail" },
  { label: "필기대기",    value: "written_wait" },
  { label: "필기합격",    value: "written_pass" },
  { label: "필기불합격",  value: "written_fail" },
  { label: "면접대기",    value: "interview_wait" },
  { label: "면접합격",    value: "interview_pass" },
  { label: "면접불합격",  value: "interview_fail" },
  { label: "최종합격",    value: "final_pass" },
  { label: "패스(미지원)", value: "withdrawn" },
  { label: "마감(미지원)", value: "expired" },
];

type SortKey = "deadline_near" | "created_desc" | "written_near";

function sortJobs(jobs: Job[], key: SortKey): Job[] {
  const copy = [...jobs];

  if (key === "deadline_near" || key === "written_near") {
    const field = key === "deadline_near" ? "application_end" : "written_exam_date";
    return copy.sort((a, b) => {
      const ta = parseLocalDate(a[field] as string | null);
      const tb = parseLocalDate(b[field] as string | null);
      const fa = ta !== null && ta >= TODAY_MS;
      const fb = tb !== null && tb >= TODAY_MS;
      if (fa && fb) return ta! - tb!;
      if (fa) return -1;
      if (fb) return 1;
      return (ta ?? 0) - (tb ?? 0);
    });
  }
  return copy.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("deadline_near");
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    supabase.from("jobs").select("*").then(({ data, error }) => {
      if (error) { console.error(error); setFetchError(error.message); }
      else if (data) setJobs(data as Job[]);
      setLoading(false);
    });
  }, []);

  function handleStatusChange(id: string, status: JobStatus) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  }

  const handleToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  }, []);

  const filtered = useMemo(() => {
    let list = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.organization ?? "").toLowerCase().includes(q) ||
          (j.duty ?? "").toLowerCase().includes(q)
      );
    }
    if (availableOnly) {
      list = list.filter(
        (j) => j.application_end && (parseLocalDate(j.application_end) ?? 0) >= TODAY_MS
      );
    }
    return sortJobs(list, sort);
  }, [jobs, filter, search, availableOnly, sort]);

  const stats: Record<string, number> = {};
  for (const j of jobs) stats[j.status] = (stats[j.status] ?? 0) + 1;

  const availableCount = jobs.filter(
    (j) => j.application_end && (parseLocalDate(j.application_end) ?? 0) >= TODAY_MS
  ).length;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
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

      {/* 검색 & 필터 & 정렬 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* 텍스트 검색 */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="기관명·제목·직무 검색..."
          aria-label="공고 검색"
          className="w-full sm:w-56 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
        />

        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              aria-label={`${opt.label} 필터`}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
              {opt.value !== "all" && stats[opt.value] ? ` (${stats[opt.value]})` : ""}
            </button>
          ))}
        </div>

        {/* 지원가능 토글 */}
        <button
          onClick={() => setAvailableOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            availableOnly
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${availableOnly ? "bg-white" : "bg-green-500"}`} />
          지원가능 {availableCount}개
        </button>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="정렬 기준"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="deadline_near">마감임박순</option>
          <option value="written_near">필기임박순</option>
          <option value="created_desc">등록일순</option>
        </select>
      </div>

      {/* 공고 테이블 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : fetchError ? (
        <div className="text-center py-20 text-red-500">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-medium">Supabase 연결 오류</p>
          <p className="text-sm mt-1 text-red-400">{fetchError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>조건에 맞는 공고가 없습니다.</p>
          {(search || filter !== "all" || availableOnly) && (
            <button
              onClick={() => { setSearch(""); setFilter("all"); setAvailableOnly(false); }}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-2 text-right">{filtered.length}개 공고</p>
          <JobTable jobs={filtered} onStatusChange={handleStatusChange} onToast={handleToast} />
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
