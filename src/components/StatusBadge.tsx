import { JobStatus, STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
