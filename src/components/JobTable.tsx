"use client";

import { useState } from "react";
import Link from "next/link";
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];
const TODAY = new Date().setHours(0, 0, 0, 0);

const FIT_BORDER: Record<number, string> = {
  5: "#48BB78",
  4: "#4299E1",
  3: "#ECC94B",
  2: "#ED8936",
  1: "#A0AEC0",
  0: "#E2E8F0",
};

const PASS_STATUSES = new Set<JobStatus>(["doc_pass", "written_pass", "interview_pass", "final_pass"]);
const FAIL_STATUSES = new Set<JobStatus>(["doc_fail", "written_fail", "interview_fail"]);

function FitStars({ fit, reason }: { fit: number | null; reason: string | null }) {
  const n = fit ?? 0;
  if (n === 0) return <span className="text-gray-300 text-xs">-</span>;
  return (
    <span
      title={reason ?? ""}
      className="cursor-help text-amber-600 tracking-tight text-sm leading-none"
      style={{ letterSpacing: -1 }}
    >
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return <span className="text-gray-300">-</span>;
  const dt = new Date(d);
  return <span>{dt.getMonth() + 1}/{dt.getDate()}</span>;
}

function DDay({ date }: { date: string | null }) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - TODAY) / 86_400_000);
  if (diff < 0)  return <span className="text-gray-400 text-[10px]">마감</span>;
  if (diff === 0) return <span className="text-red-600 font-bold text-[10px]">D-day</span>;
  if (diff <= 3)  return <span className="text-red-500 font-bold text-[10px]">D-{diff}</span>;
  if (diff <= 7)  return <span className="text-orange-500 text-[10px]">D-{diff}</span>;
  return <span className="text-gray-400 text-[10px]">D-{diff}</span>;
}

interface Props {
  jobs: Job[];
  onStatusChange?: (id: string, status: JobStatus) => void;
}

function Row({ job, onStatusChange }: { job: Job; onStatusChange?: Props["onStatusChange"] }) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [saving, setSaving] = useState(false);

  const isPass = PASS_STATUSES.has(status);
  const isFail = FAIL_STATUSES.has(status);
  const borderColor = FIT_BORDER[job.fit ?? 0] ?? "#E2E8F0";

  const rowCls = isPass
    ? "border-b border-gray-100 transition-colors group bg-emerald-50/60 hover:bg-emerald-50"
    : isFail
    ? "border-b border-gray-100 transition-colors group bg-red-50/50 hover:bg-red-50 opacity-70"
    : "border-b border-gray-100 hover:bg-indigo-50/40 transition-colors group";

  async function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const next = e.target.value as JobStatus;
    setSaving(true);
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", job.id);
    if (!error) {
      setStatus(next);
      onStatusChange?.(job.id, next);
    }
    setSaving(false);
  }

  return (
    <tr className={rowCls}>
      {/* 기관명 — 왼쪽 보더로 적합도 색 표시 */}
      <td
        className="py-2.5 pl-3 pr-2 whitespace-nowrap"
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-gray-700 hover:text-indigo-600 group-hover:underline">
          {job.organization ?? "-"}
        </Link>
      </td>

      {/* 적합도 */}
      <td className="py-2.5 px-2 text-center whitespace-nowrap">
        <FitStars fit={job.fit} reason={job.fit_reason} />
      </td>

      {/* 직무 */}
      <td className="py-2.5 px-2 whitespace-nowrap">
        <span className="text-xs text-gray-600">{job.duty ?? "-"}</span>
      </td>

      {/* 지역 */}
      <td className="py-2.5 px-2 whitespace-nowrap">
        <span className="text-xs text-gray-600">{job.work_location ?? "-"}</span>
      </td>

      {/* 서류마감 */}
      <td className="py-2.5 px-2 text-center whitespace-nowrap">
        <div className="text-xs text-gray-700">{fmt(job.application_end)}</div>
        <DDay date={job.application_end} />
      </td>

      {/* 서류발표 */}
      <td className="py-2.5 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
        {fmt(job.doc_announcement_date)}
      </td>

      {/* 필기 */}
      <td className="py-2.5 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
        {fmt(job.written_exam_date)}
      </td>

      {/* 면접1 */}
      <td className="py-2.5 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
        {fmt(job.interview_date)}
      </td>

      {/* 면접2 */}
      <td className="py-2.5 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
        {fmt(job.interview_date_2)}
      </td>

      {/* 최종발표 */}
      <td className="py-2.5 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
        {fmt(job.announcement_date)}
      </td>

      {/* 상태 드롭다운 */}
      <td className="py-2.5 pl-2 pr-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <select
          value={status}
          onChange={handleStatus}
          disabled={saving}
          className={`text-xs rounded-lg px-2 py-1 border-0 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${STATUS_COLORS[status]} ${saving ? "opacity-50" : ""}`}
        >
          {STATUSES.map(([val, label]) => (
            <option key={val} value={val} className="bg-white text-gray-900 font-normal">
              {label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

export default function JobTable({ jobs, onStatusChange }: Props) {
  const headers = [
    { label: "기관명",   cls: "pl-3 pr-2 text-left" },
    { label: "적합도",   cls: "px-2 text-center" },
    { label: "직무",    cls: "px-2 text-left" },
    { label: "지역",    cls: "px-2 text-left" },
    { label: "서류마감", cls: "px-2 text-center" },
    { label: "서류발표", cls: "px-2 text-center" },
    { label: "필기",    cls: "px-2 text-center" },
    { label: "면접1차", cls: "px-2 text-center" },
    { label: "면접2차", cls: "px-2 text-center" },
    { label: "최종발표", cls: "px-2 text-center" },
    { label: "상태",    cls: "pl-2 pr-3 text-left" },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h) => (
              <th
                key={h.label}
                className={`py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h.cls}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <Row key={job.id} job={job} onStatusChange={onStatusChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
