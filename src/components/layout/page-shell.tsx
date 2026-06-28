import { cn } from "@/lib/utils";

const widthClass = {
  full: "",
  lg: "max-w-5xl",
  md: "max-w-3xl",
  sm: "max-w-2xl",
} as const;

export function PageShell({
  children,
  width = "full",
  className,
}: {
  children: React.ReactNode;
  width?: keyof typeof widthClass;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", widthClass[width], className)}>{children}</div>
  );
}
