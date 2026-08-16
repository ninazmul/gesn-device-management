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

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.border} ${config.darkBg} ${config.text} ${sizeClasses} ${className} shrink-0 transition-colors`}
    >
      <span className={`rounded-full shrink-0 ${config.dot} ${dotSize}`} />
      <span>{config.label}</span>
    </span>
  );
}
