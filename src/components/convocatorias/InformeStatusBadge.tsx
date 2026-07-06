import { Badge } from "@/components/ui/badge";
import { informeStatusLabel, type InformeStatus } from "@/lib/informeStatus";

export function InformeStatusBadge({ status }: { status: InformeStatus }) {
  const variant =
    status === "SENT" ? "default" : status === "FINAL" ? "outline" : "secondary";
  return <Badge variant={variant}>{informeStatusLabel(status)}</Badge>;
}
