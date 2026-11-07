import { Suspense } from "react";
import { NewMatchForm } from "@/components/matches/NewMatchForm";
import { LoadingState } from "@/components/layout";

export default function NuevoPartidoPage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando..." />}>
      <NewMatchForm />
    </Suspense>
  );
}
