"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Job } from "@/lib/types";
import JobForm from "@/components/JobForm";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setJob(data as Job));
  }, [id]);

  if (!job) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">공고 수정</h1>
      <JobForm initialData={job} jobId={id} />
    </main>
  );
}
