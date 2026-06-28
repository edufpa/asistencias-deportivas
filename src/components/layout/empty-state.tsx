import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

export function DataTableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border bg-card", className)}>{children}</div>
  );
}
