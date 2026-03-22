import { cn } from "@/lib/utils";
import type { ProcessingStatus as ProcessingStatusType } from "@/types";

interface ProcessingStatusProps {
  status: ProcessingStatusType;
  className?: string;
}

const CONFIG: Record<ProcessingStatusType, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]" },
  processing: { label: "Processing", className: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE] animate-pulse" },
  completed: { label: "Completed", className: "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]" },
  failed: { label: "Failed", className: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]" },
};

export default function ProcessingStatus({ status, className }: ProcessingStatusProps) {
  const { label, className: statusClass } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusClass,
        className
      )}
    >
      {label}
    </span>
  );
}
