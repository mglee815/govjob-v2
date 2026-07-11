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

function fmt(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function DeadlineBadge({ date }: { date: string | null }) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return <span className="text-xs text-gray-400">마감</span>;
  if (days === 0) return <span className="text-xs font-bold text-red-600">D-day</span>;
  if (days <= 3) return <span className="text-xs font-bold text-red-500">D-{days}</span>;
  if (days <= 7) return <span className="text-xs font-bold text-orange-500">D-{days}</span>;
  return <span className="text-xs text-gray-400">D-{days}</span>;
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

  const dates: { label: string; value: string | null; highlight?: boolean }[] = [
    { label: "서류마감", value: job.application_end, highlight: true },
    { label: "서류발표", value: job.doc_announcement_date },
    { label: "필기",    value: job.written_exam_date },
    { label: "면접1차", value: job.interview_date },
    { label: "면접2차", value: job.interview_date_2 },
    { label: "최종발표", value: job.announcement_date },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all flex flex-col gap-3">

      {/* 제목 + 마감 D-day */}
      <Link href={`/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{job.organization ?? "기관명 없음"}</p>
            <h3 className="font-semibold text-gray-900 leading-snug">{job.title}</h3>
          </div>
          <DeadlineBadge date={job.application_end} />
        </div>
      </Link>

      {/* 태그: 채용형태, 지역, 인원 */}
      {(job.employment_type || job.work_location || job.headcount) && (
        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
          {job.employment_type && (
            <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{job.employment_type}</span>
          )}
          {job.work_location && (
            <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">📍{job.work_location}</span>
          )}
          {job.headcount && (
            <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{job.headcount}명</span>
          )}
        </div>
      )}

      {/* 일정 그리드 */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs border border-gray-100 rounded-lg p-2.5 bg-gray-50">
        {dates.map(({ label, value, highlight }) => (
          <div key={label} className="flex flex-col">
            <span className="text-gray-400 text-[10px] leading-none mb-0.5">{label}</span>
            <span className={`font-medium ${value ? (highlight ? "text-indigo-700" : "text-gray-700") : "text-gray-300"}`}>
              {fmt(value)}
            </span>
          </div>
        ))}
      </div>

      {/* 상태 드롭다운 */}
      <select
        value={status}
        onChange={handleStatusChange}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        className={`w-full text-xs rounded-lg px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors font-medium ${STATUS_COLORS[status]} ${saving ? "opacity-50" : ""}`}
      >
        {STATUSES.map(([val, label]) => (
          <option key={val} value={val} className="bg-white text-gray-900 font-normal">
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
