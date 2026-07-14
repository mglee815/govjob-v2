"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobStatus } from "@/lib/types";
import { parseLocalDate, TODAY_MS } from "@/lib/dates";
import { SortField, SortDir, sortJobs } from "@/lib/sort";
import JobTable from "@/components/JobTable";
import Toast from "@/components/Toast";

// KPI 카드는 "현재 상태"가 아니라 "그 단계까지 도달했던 누적 건수"를 보여준다.
// 예) 서류합격 이후 필기에서 떨어졌어도(written_fail) 서류는 합격했던 것이므로 "서류합격" 누적 건수에는 포함된다.
const KPI_DEFS: {
  key: string;
  label: string;
  statuses: JobStatus[];
  bg: string;
  border: string;
  num: string;
}[] = [
  {
    key: "submitted",
    label: "서류제출 (누적)",
    statuses: ["applied", "doc_fail", "written_wait", "written_pass", "written_fail", "interview_wait", "interview_pass", "interview_fail", "final_pass"],
    bg: "bg-indigo-50", border: "border-indigo-200 hover:border-indigo-400", num: "text-indigo-600",
  },
  {
    key: "doc_passed",
    label: "서류합격 (누적)",
    statuses: ["written_wait", "written_pass", "written_fail", "interview_wait", "interview_pass", "interview_fail", "final_pass"],
    bg: "bg-yellow-50", border: "border-yellow-200 hover:border-yellow-400", num: "text-yellow-600",
  },
  {
    key: "written_passed",
    label: "필기합격 (누적)",
    statuses: ["written_pass", "interview_wait", "interview_pass", "interview_fail", "final_pass"],
    bg: "bg-orange-50", border: "border-orange-200 hover:border-orange-400", num: "text-orange-600",
  },
  {
    key: "interview_passed",
    label: "면접합격 (누적)",
    statuses: ["interview_pass", "final_pass"],
    bg: "bg-purple-50", border: "border-purple-200 hover:border-purple-400", num: "text-purple-600",
  },
];

// "지원가능" 집계에서 제외할 상태 (이미 지원했거나 더 이상 지원 대상이 아닌 건)
const NOT_APPLICABLE_STATUSES: JobStatus[] = [
  "applied", "doc_fail", "written_wait", "written_pass", "written_fail",
  "interview_wait", "interview_pass", "interview_fail", "final_pass", "withdrawn", "expired",
];

const FILTER_OPTIONS: { label: string; value: JobStatus | "all" }[] = [
  { label: "전체",        value: "all" },
  { label: "모니터링",    value: "monitoring" },
  { label: "접수중",      value: "available" },
  { label: "서류제출",    value: "applied" },
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

// application_end 연도 기준 (없으면 소속 연도 판정 불가로 취급)
function jobYear(job: Job): string | null {
  return job.application_end ? job.application_end.slice(0, 4) : null;
}

const QUICK_SORT_OPTIONS: { label: string; field: SortField; dir: SortDir }[] = [
  { label: "마감임박순", field: "application_end", dir: "asc" },
  { label: "필기임박순", field: "written_exam_date", dir: "asc" },
  { label: "등록일순",   field: "created_at", dir: "desc" },
];

const CURRENT_YEAR = String(new Date().getFullYear());

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus[] | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>(CURRENT_YEAR);
  const [sortField, setSortField] = useState<SortField>("application_end");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
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

  // 연도 필터 (기본값: 올해) - 서류마감 연도 기준. 날짜가 없는 건(상시 등)은 "전체"에서만 노출
  const availableYears = useMemo(
    () => Array.from(new Set(jobs.map(jobYear).filter((y): y is string => !!y))).sort().reverse(),
    [jobs]
  );
  const yearFilteredJobs = useMemo(
    () => (yearFilter === "all" ? jobs : jobs.filter((j) => jobYear(j) === yearFilter)),
    [jobs, yearFilter]
  );

  const filtered = useMemo(() => {
    let list = filter === "all" ? yearFilteredJobs : yearFilteredJobs.filter((j) => filter.includes(j.status));
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
        (j) =>
          j.application_end &&
          (parseLocalDate(j.application_end) ?? 0) >= TODAY_MS &&
          !NOT_APPLICABLE_STATUSES.includes(j.status)
      );
    }
    return sortJobs(list, sortField, sortDir);
  }, [yearFilteredJobs, filter, search, availableOnly, sortField, sortDir]);

  const stats: Record<string, number> = {};
  for (const j of yearFilteredJobs) stats[j.status] = (stats[j.status] ?? 0) + 1;

  // 지원가능: 아직 지원하지 않은(모니터링·접수중) 건 중 마감 전인 것만
  const availableCount = yearFilteredJobs.filter(
    (j) =>
      j.application_end &&
      (parseLocalDate(j.application_end) ?? 0) >= TODAY_MS &&
      !NOT_APPLICABLE_STATUSES.includes(j.status)
  ).length;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* 연도 필터 - 기본은 올해만, 작년 이전 건은 해당 연도를 눌러야 보임 */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs text-gray-400 mr-1">연도</span>
        <button
          onClick={() => setYearFilter("all")}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            yearFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          전체 연도
        </button>
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              yearFilter === y ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {y}년
          </button>
        ))}
      </div>

      {/* KPI 카드 - 단계별 누적 건수 (해당 단계 도달 이후 더 진행/탈락했어도 포함) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KPI_DEFS.map((k) => {
          const count = yearFilteredJobs.filter((j) => k.statuses.includes(j.status)).length;
          const isActive = Array.isArray(filter) && filter.length === k.statuses.length && k.statuses.every((s) => filter.includes(s));
          return (
            <button
              key={k.key}
              onClick={() => setFilter(isActive ? "all" : k.statuses)}
              className={`${k.bg} border-2 rounded-xl p-4 text-center transition-all ${k.border} ${
                isActive ? "ring-2 ring-offset-1 ring-indigo-400 shadow-md" : ""
              }`}
            >
              <p className={`text-2xl font-bold ${k.num}`}>{count}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </button>
          );
        })}
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

        {/* 상태 필터 - 한 줄로 이어지며 가로 스크롤 (스크롤바는 숨겨서 다른 컨트롤과 높이를 맞춤) */}
        <div
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto flex-1 min-w-0 h-8 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = opt.value === "all" ? filter === "all" : Array.isArray(filter) && filter.length === 1 && filter[0] === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value === "all" ? "all" : [opt.value])}
                aria-label={`${opt.label} 필터`}
                className={`shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
                {opt.value !== "all" && stats[opt.value] ? ` (${stats[opt.value]})` : ""}
              </button>
            );
          })}
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

        {/* 빠른 정렬 (컬럼 헤더 클릭으로도 세부 정렬 가능) */}
        <select
          value={QUICK_SORT_OPTIONS.findIndex((o) => o.field === sortField && o.dir === sortDir)}
          onChange={(e) => {
            const opt = QUICK_SORT_OPTIONS[Number(e.target.value)];
            if (opt) { setSortField(opt.field); setSortDir(opt.dir); }
          }}
          aria-label="정렬 기준"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {QUICK_SORT_OPTIONS.map((o, i) => (
            <option key={o.label} value={i}>{o.label}</option>
          ))}
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
          <JobTable
            jobs={filtered}
            onStatusChange={handleStatusChange}
            onToast={handleToast}
            sortField={sortField}
            sortDir={sortDir}
            onSortChange={(field, dir) => { setSortField(field); setSortDir(dir); }}
          />
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
