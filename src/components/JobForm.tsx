"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Job, JobInsert, JobStatus, STATUS_LABELS } from "@/lib/types";

const STATUSES = Object.entries(STATUS_LABELS) as [JobStatus, string][];

interface Props {
  initialData?: Partial<Job>;
  jobId?: string;
}

export default function JobForm({ initialData = {}, jobId }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(initialData.url ?? "");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState<JobInsert>({
    title: initialData.title ?? "",
    organization: initialData.organization ?? "",
    url: initialData.url ?? "",
    duty: initialData.duty ?? "",
    employment_type: initialData.employment_type ?? "",
    fit: initialData.fit ?? 0,
    fit_reason: initialData.fit_reason ?? "",
    work_location: initialData.work_location ?? "",
    eligibility: initialData.eligibility ?? "",
    selection_method: initialData.selection_method ?? "",
    headcount: initialData.headcount ?? null,
    doc_screening_ratio: initialData.doc_screening_ratio ?? "",
    written_exam_ratio: initialData.written_exam_ratio ?? "",
    salary: initialData.salary ?? "",
    application_start: initialData.application_start ?? "",
    application_end: initialData.application_end ?? "",
    doc_announcement_date: initialData.doc_announcement_date ?? "",
    written_exam_date: initialData.written_exam_date ?? "",
    interview_date: initialData.interview_date ?? "",
    interview_date_2: initialData.interview_date_2 ?? "",
    announcement_date: initialData.announcement_date ?? "",
    notes: initialData.notes ?? "",
    status: initialData.status ?? "monitoring",
  });

  function set(field: keyof JobInsert, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleParseUrl() {
    if (!url) return;
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "파싱 실패");
      } else {
        if (data.title) set("title", data.title);
        set("url", url);
        setParseError("페이지를 가져왔습니다. 아래 내용을 직접 채워주세요.");
      }
    } catch {
      setParseError("네트워크 오류. 직접 입력해주세요.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      url: url || null,
      headcount: form.headcount ? Number(form.headcount) : null,
      application_start: form.application_start || null,
      application_end: form.application_end || null,
      doc_announcement_date: form.doc_announcement_date || null,
      written_exam_date: form.written_exam_date || null,
      interview_date: form.interview_date || null,
      interview_date_2: form.interview_date_2 || null,
      announcement_date: form.announcement_date || null,
      organization: form.organization || null,
      duty: form.duty || null,
      employment_type: form.employment_type || null,
      fit: form.fit ?? 0,
      fit_reason: form.fit_reason || null,
      work_location: form.work_location || null,
      eligibility: form.eligibility || null,
      selection_method: form.selection_method || null,
      doc_screening_ratio: form.doc_screening_ratio || null,
      written_exam_ratio: form.written_exam_ratio || null,
      salary: form.salary || null,
      notes: form.notes || null,
    };

    const { error } = jobId
      ? await supabase.from("jobs").update(payload).eq("id", jobId)
      : await supabase.from("jobs").insert(payload);

    if (error) {
      setSaveError("저장 실패: " + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL 파싱 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-blue-800 mb-2">공고 URL (선택)</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={handleParseUrl}
            disabled={parsing || !url}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {parsing ? "분석 중..." : "가져오기"}
          </button>
        </div>
        {parseError && (
          <p className="mt-2 text-xs text-blue-700">{parseError}</p>
        )}
      </div>

      {/* 기본 정보 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">기본 정보</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">공고 제목 *</label>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="input"
              placeholder="예) 2025년 하반기 신규직원 채용"
            />
          </div>
          <div>
            <label className="label">기관명</label>
            <input
              value={form.organization ?? ""}
              onChange={(e) => set("organization", e.target.value)}
              className="input"
              placeholder="예) 한국수자원공사"
            />
          </div>
          <div>
            <label className="label">직무</label>
            <input
              value={form.duty ?? ""}
              onChange={(e) => set("duty", e.target.value)}
              className="input"
              placeholder="예) 일반직 6급, 행정직, 사무행정"
            />
          </div>
          <div>
            <label className="label">고용형태</label>
            <input
              value={form.employment_type ?? ""}
              onChange={(e) => set("employment_type", e.target.value)}
              className="input"
              placeholder="예) 정규직, 무기계약직"
            />
          </div>
          <div>
            <label className="label">근무지</label>
            <input
              value={form.work_location ?? ""}
              onChange={(e) => set("work_location", e.target.value)}
              className="input"
              placeholder="예) 대전, 서울"
            />
          </div>
          <div>
            <label className="label">급여/보수</label>
            <input
              value={form.salary ?? ""}
              onChange={(e) => set("salary", e.target.value)}
              className="input"
              placeholder="예) 연봉 3,500만원~"
            />
          </div>
          <div>
            <label className="label">선발인원</label>
            <input
              type="number"
              min={1}
              value={form.headcount ?? ""}
              onChange={(e) => set("headcount", e.target.value ? Number(e.target.value) : null)}
              className="input"
              placeholder="예) 5"
            />
          </div>
          <div>
            <label className="label">나의 지원 상태</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="input"
            >
              {STATUSES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 적합도 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">직무 적합도</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">별점 (1~5, 0=미평가)</label>
            <select
              value={form.fit ?? 0}
              onChange={(e) => set("fit", Number(e.target.value))}
              className="input"
            >
              <option value={0}>미평가</option>
              <option value={1}>★ (1점)</option>
              <option value={2}>★★ (2점)</option>
              <option value={3}>★★★ (3점)</option>
              <option value={4}>★★★★ (4점)</option>
              <option value={5}>★★★★★ (5점)</option>
            </select>
          </div>
          <div>
            <label className="label">평가 이유</label>
            <input
              value={form.fit_reason ?? ""}
              onChange={(e) => set("fit_reason", e.target.value)}
              className="input"
              placeholder="예) 서울 정규직, 데이터분석 직무, 석사 우대"
            />
          </div>
        </div>
      </section>

      {/* 지원자격 & 선발방식 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">자격 & 선발</h2>
        <div className="grid gap-4">
          <div>
            <label className="label">지원자격</label>
            <textarea
              rows={3}
              value={form.eligibility ?? ""}
              onChange={(e) => set("eligibility", e.target.value)}
              className="input"
              placeholder="예) 학력 무관, 해당 분야 경력 3년 이상..."
            />
          </div>
          <div>
            <label className="label">선발방식</label>
            <textarea
              rows={2}
              value={form.selection_method ?? ""}
              onChange={(e) => set("selection_method", e.target.value)}
              className="input"
              placeholder="예) 서류전형 → 필기시험 → 면접전형"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">서류배수</label>
              <input
                value={form.doc_screening_ratio ?? ""}
                onChange={(e) => set("doc_screening_ratio", e.target.value)}
                className="input"
                placeholder="예) 3배수"
              />
            </div>
            <div>
              <label className="label">필기배수</label>
              <input
                value={form.written_exam_ratio ?? ""}
                onChange={(e) => set("written_exam_ratio", e.target.value)}
                className="input"
                placeholder="예) 2배수"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 일정 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">일정</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "application_start",    label: "접수 시작일" },
            { key: "application_end",      label: "서류 마감일" },
            { key: "doc_announcement_date",label: "서류 발표일" },
            { key: "written_exam_date",    label: "필기시험일" },
            { key: "interview_date",       label: "면접일 (1차)" },
            { key: "interview_date_2",     label: "면접일 (2차)" },
            { key: "announcement_date",    label: "최종 발표일" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                type="date"
                value={(form as Record<string, string | null>)[key] ?? ""}
                onChange={(e) => set(key as keyof JobInsert, e.target.value || null)}
                className="input"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 메모 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">메모</h2>
        <textarea
          rows={4}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className="input"
          placeholder="준비 사항, 유의사항, 기타 메모..."
        />
      </section>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700" role="alert">
          {saveError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : jobId ? "수정 저장" : "공고 등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
