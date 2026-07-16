"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Job, JobStatus, STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 whitespace-pre-wrap">{value}</span>
    </div>
  );
}

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setJob(data as Job);
        setLoading(false);
      });
  }, [id]);

  async function updateStatus(status: JobStatus) {
    if (!job) return;
    setStatusUpdating(true);
    setError(null);
    const { error: err } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (err) {
      setError("상태 변경 실패: " + err.message);
    } else {
      setJob({ ...job, status });
    }
    setStatusUpdating(false);
  }

  async function deleteJob() {
    if (!confirm("이 공고를 삭제할까요?")) return;
    setDeleting(true);
    const { error: err } = await supabase.from("jobs").delete().eq("id", id);
    if (err) {
      setError("삭제 실패: " + err.message);
      setDeleting(false);
      return;
    }
    router.push("/");
  }

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  if (!job && error) return <div className="text-center py-20 text-red-500">오류: {error}</div>;
  if (!job) return <div className="text-center py-20 text-gray-400">공고를 찾을 수 없습니다.</div>;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← 목록</Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{job.organization}</p>
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* 상태 변경 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">지원 상태 변경</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(([val, label]) => (
              <button
                key={val}
                onClick={() => updateStatus(val)}
                disabled={statusUpdating}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  job.status === val
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 적합도 */}
      {(job.fit ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">직무 적합도</h2>
          <div className="flex items-center gap-3">
            <span
              className="text-amber-600 text-2xl"
              style={{ letterSpacing: -2 }}
            >
              {"★".repeat(job.fit ?? 0)}
              <span className="text-gray-300">{"☆".repeat(5 - (job.fit ?? 0))}</span>
            </span>
            <span className="text-sm text-gray-700">{job.fit_reason ?? "-"}</span>
          </div>
        </div>
      )}

      {/* 상세 정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">공고 정보</h2>
        <Row label="기관" value={job.organization} />
        <Row label="직무" value={job.duty} />
        <Row label="고용형태" value={job.employment_type} />
        <Row label="근무지" value={job.work_location} />
        <Row label="급여" value={job.salary} />
        <Row label="선발인원" value={job.headcount ? `${job.headcount}명` : null} />
        {job.url && (
          <div className="flex gap-2 py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 w-28 shrink-0">공고 링크</span>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">
              원문 보기 →
            </a>
          </div>
        )}
      </div>

      {/* 자격 & 선발 */}
      {(job.eligibility || job.selection_method) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">자격 & 선발</h2>
          <Row label="지원자격" value={job.eligibility} />
          <Row label="선발방식" value={job.selection_method} />
        <Row label="서류배수" value={job.doc_screening_ratio} />
        <Row label="필기배수" value={job.written_exam_ratio} />
        </div>
      )}

      {/* 일정 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">일정</h2>
        <Row label="접수 시작" value={job.application_start ? new Date(job.application_start).toLocaleDateString("ko-KR") : null} />
        <Row label="접수 마감" value={job.application_end ? new Date(job.application_end).toLocaleDateString("ko-KR") : null} />
        <Row label="서류 발표" value={job.doc_announcement_date ? new Date(job.doc_announcement_date).toLocaleDateString("ko-KR") : null} />
        <Row label="필기시험" value={job.written_exam_date ? new Date(job.written_exam_date).toLocaleDateString("ko-KR") : null} />
        <Row label="면접 1차" value={job.interview_date ? new Date(job.interview_date).toLocaleDateString("ko-KR") : null} />
        <Row label="면접 2차" value={job.interview_date_2 ? new Date(job.interview_date_2).toLocaleDateString("ko-KR") : null} />
        <Row label="최종발표" value={job.announcement_date ? new Date(job.announcement_date).toLocaleDateString("ko-KR") : null} />
      </div>

      {/* 메모 */}
      {job.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">메모</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Link
          href={`/jobs/${id}/edit`}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          수정
        </Link>
        <button
          onClick={deleteJob}
          disabled={deleting}
          className="px-5 py-2.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </main>
  );
}
