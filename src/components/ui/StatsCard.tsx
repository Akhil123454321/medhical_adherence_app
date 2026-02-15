import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                trendUp ? "text-green-600" : "text-red-600"
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-indigo-50 p-3">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
