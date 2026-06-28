import { redirect } from "next/navigation";

export default async function PlayerAsistenciaRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/players/${id}?tab=asistencia`);
}
