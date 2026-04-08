import { Suspense } from "react";
import { AsistenciaClient } from "./AsistenciaClient";

export default function AsistenciaPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 py-12 text-center">Cargando registro de asistencia...</div>}>
      <AsistenciaClient />
    </Suspense>
  );
}
