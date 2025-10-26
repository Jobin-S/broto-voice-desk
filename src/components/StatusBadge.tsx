import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ComplaintStatus = "open" | "in_progress" | "resolved";

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

const statusConfig = {
  open: {
    label: "Open",
    className: "bg-status-open text-status-open-foreground border-status-open",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-status-in-progress text-status-in-progress-foreground border-status-in-progress",
  },
  resolved: {
    label: "Resolved",
    className: "bg-status-resolved text-status-resolved-foreground border-status-resolved",
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-colors",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
};