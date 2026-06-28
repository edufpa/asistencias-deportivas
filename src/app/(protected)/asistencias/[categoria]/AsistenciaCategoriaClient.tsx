"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

/** Redirige a la página principal con los mismos parámetros en query. */
export function AsistenciaCategoriaClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoria = params.categoria as string;
  const sessionId = searchParams.get("sessionId");

  useEffect(() => {
    const q = new URLSearchParams();
    if (categoria) q.set("category", categoria);
    if (sessionId) q.set("sessionId", sessionId);
    router.replace(`/asistencias?${q.toString()}`);
  }, [categoria, sessionId, router]);

  return <div className="text-gray-400 py-12 text-center">Redirigiendo...</div>;
}
