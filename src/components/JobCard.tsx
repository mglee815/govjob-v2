"use client";

import Link from "next/link";
import { useState } from "react";
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ date }: { date: string | null }) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return <span className="text-xs text-gray-400">마감</span>;
  if (days === 0) return <span className="text-xs font-semibold text-red-600">D-day</span>;
  if (days <= 3) return <span className="text-xs font-semibold text-red-500">D-{days}</span>;
  if (days <= 7) return <span className="text-xs font-semibold text-orange-500">D-{days}</span>;
  return <span className="text-xs text-gray-500">D-{days}</span>;
}

interface Props {
  job: Job;
  onStatusChange?: (id: string, status: JobStatus) => void;
}

export default function JobCard({ job, onStatusChange }: Props) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault();
    e.stopPropagation();
    const next = e.target.value as JobStatus;
    setSaving(true);
    const { error } = await supabase
      .from("jobs")
      .update({ status: next })
      .eq("id", job.id);
    if (!error) {
      setStatus(next);
      onStatusChange?.(job.id, next);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all">
      {/* 제목 영역 — 클릭 시 상세 페이지 */}
      <Link href={`/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{job.organization ?? "기관명 없음"}</p>
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {job.employment_type && (
            <span className="bg-gray-50 px-2 py-0.5 rounded">{job.employment_type}</span>
          )}
          {job.work_location && (
            <span className="bg-gray-50 px-2 py-0.5 rounded">📍 {job.work_location}</span>
          )}
          {job.headcount && (
            <span className="bg-gray-50 px-2 py-0.5 rounded">{job.headcount}명 선발</span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            마감:{" "}
            {job.application_end
              ? new Date(job.application_end).toLocaleDateString("ko-KR")
              : "-"}
          </span>
          <DeadlineBadge date={job.application_end} />
        </div>
      </Link>

      {/* 상태 드롭다운 — 클릭 이벤트 카드와 분리 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={saving}
          onClick={(e) => e.stopPropagation()}
          className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ${STATUS_COLORS[status]} border-transparent ${saving ? "opacity-50" : ""}`}
        >
          {STATUSES.map(([val, label]) => (
            <option key={val} value={val} className="bg-white text-gray-900">
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
