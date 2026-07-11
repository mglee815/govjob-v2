import JobForm from "@/components/JobForm";

export default function NewJobPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">공고 추가</h1>
      <JobForm />
    </main>
  );
}
