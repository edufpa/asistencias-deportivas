export type InformeStatus = "DRAFT" | "FINAL" | "SENT";

export function informeStatusLabel(status: InformeStatus): string {
  if (status === "SENT") return "Enviado";
  if (status === "FINAL") return "Final";
  return "Borrador";
}

export function canDownloadInformePdf(status: InformeStatus): boolean {
  return status === "FINAL" || status === "SENT";
}

export function canSendInformeToComision(status: InformeStatus): boolean {
  return status === "FINAL";
}

export function canFinalizeInforme(status: InformeStatus): boolean {
  return status === "DRAFT";
}
