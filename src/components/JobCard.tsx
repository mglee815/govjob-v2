"use client";

import Link from "next/link";
import { Job } from "@/lib/types";
import StatusBadge from "./StatusBadge";

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

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{job.organization ?? "기관명 없음"}</p>
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
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
            접수마감:{" "}
            {job.application_end
              ? new Date(job.application_end).toLocaleDateString("ko-KR")
              : "-"}
          </span>
          <DeadlineBadge date={job.application_end} />
        </div>
      </div>
    </Link>
  );
}
