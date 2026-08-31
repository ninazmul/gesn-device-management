import { STATUS_CONFIG } from "@/lib/constants";
import type { DeviceStatus } from "@/types";

interface DeviceStatusBadgeProps {
  status: DeviceStatus | string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function DeviceStatusBadge({
  status,
  className = "",
  size = "md",
}: DeviceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Active"];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size];

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  const isOnline = status === "Active" || status === "Available";
  const isPending = status === "Pending" || status === "Maintenance";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.border} ${config.darkBg} ${config.text} ${sizeClasses} ${className} shrink-0 transition-colors`}
    >
      <span className="relative flex items-center justify-center shrink-0">
        {isOnline && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              status === "Active" ? "bg-emerald-400" : "bg-blue-400"
            }`}
          />
        )}
        {isPending && (
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-60 bg-amber-400" />
        )}
        <span className={`relative rounded-full shrink-0 ${config.dot.replace("animate-pulse", "")} ${dotSize}`} />
      </span>
      <span>{config.label}</span>
    </span>
  );
}

