import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function filterChipClass(active: boolean, size: "sm" | "md" = "sm") {
  return cn(
    "rounded-lg border font-semibold transition-colors",
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:border-primary/40"
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  size = "sm",
  className,
  type = "button",
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(filterChipClass(active, size), className)}
    >
      {children}
    </button>
  );
}

export function FilterChipGroup({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function FilterPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-muted/40 p-3 lg:flex-row lg:items-start lg:gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}
