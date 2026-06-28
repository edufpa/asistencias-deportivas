import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClass = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-emerald-600",
  muted: "text-muted-foreground",
} as const;

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  align = "start",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: keyof typeof toneClass;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent
        className={cn(
          "flex gap-3 p-4",
          align === "center" && "flex-col items-center text-center",
          Icon && align === "start" && "items-start"
        )}
      >
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className={cn("min-w-0", align === "center" && !Icon && "w-full")}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1 text-2xl font-bold tabular-nums leading-none", toneClass[tone])}>
            {value}
          </p>
          {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
