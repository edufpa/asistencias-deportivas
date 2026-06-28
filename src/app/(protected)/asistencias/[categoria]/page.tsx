import { Suspense } from "react";
import { AsistenciaCategoriaClient } from "./AsistenciaCategoriaClient";

export default function AsistenciaCategoriaPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Cargando...</div>}>
      <AsistenciaCategoriaClient />
    </Suspense>
  );
}
