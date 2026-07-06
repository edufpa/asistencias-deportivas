"use client";

import { CoachReportForm } from "@/components/convocatorias/CoachReportForm";
import { useParams } from "next/navigation";

export default function EditarInformePage() {
  const params = useParams();
  const informeId = params.informeId as string;
  return <CoachReportForm mode="edit" informeId={informeId} />;
}
