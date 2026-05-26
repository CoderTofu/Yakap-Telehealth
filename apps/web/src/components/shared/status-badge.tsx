import type { Status } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

const STYLES: Record<Status, string> = {
  pending: "bg-yakap-warning-light text-[#92400E]",
  confirmed: "bg-yakap-accent-light text-[#065F46]",
  cancelled: "bg-yakap-danger-light text-[#991B1B]",
  completed: "bg-slate-100 text-slate-600",
};

const LABELS: Record<Status, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
