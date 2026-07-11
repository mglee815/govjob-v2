"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobStatus, STATUS_LABELS } from "@/lib/types";
import JobCard from "@/components/JobCard";

const FILTER_OPTIONS: { label: string; value: JobStatus | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "관심", value: "bookmarked" },
  { label: "지원예정", value: "planning" },
  { label: "지원완료", value: "applied" },
  { label: "서류합격", value: "doc_pass" },
  { label: "필기합격", value: "written_pass" },
  { label: "면접합격", value: "interview_pass" },
  { label: "최종합격", value: "final_pass" },
  { label: "불합격", value: "failed" },
];

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState<"deadline" | "created">("deadline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order(sort === "deadline" ? "application_end" : "created_at", {
          ascending: sort === "deadline",
          nullsFirst: false,
        });
      if (!error && data) setJobs(data as Job[]);
      setLoading(false);
    }
    fetchJobs();
  }, [sort]);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const stats: Record<string, number> = {};
  for (const j of jobs) {
    stats[j.status] = (stats[j.status] ?? 0) + 1;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["applied", "doc_pass", "interview_pass", "final_pass"] as JobStatus[]).map((s) => (
          <div key={s} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats[s] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      {/* 필터 & 정렬 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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

      {/* 공고 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>공고가 없습니다. 오른쪽 위 버튼으로 추가해보세요.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </main>
  );
}
