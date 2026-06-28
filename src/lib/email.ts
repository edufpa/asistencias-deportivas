type SendResult = { sent: true } | { sent: false; reason: string };

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "Asistencias <onboarding@resend.dev>";

  const subject = "Restablecer contraseña — Regatas Lima";
  const html = `
    <p>Hola ${escapeHtml(userName)},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en Asistencias Deportivas.</p>
    <p><a href="${resetUrl}">Hacé clic acá para elegir una nueva contraseña</a></p>
    <p>Este enlace expira en 1 hora. Si no solicitaste el cambio, podés ignorar este correo.</p>
    <p style="color:#64748b;font-size:12px;">Regatas Lima — Asistencias Deportivas</p>
  `.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[password-reset] Sin RESEND_API_KEY. Link para ${to}: ${resetUrl}`);
    } else {
      console.warn(`[password-reset] RESEND_API_KEY no configurada. No se envió email a ${to}`);
    }
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[password-reset] Resend error:", res.status, body);
      return { sent: false, reason: "send_failed" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[password-reset] send error:", error);
    return { sent: false, reason: "send_failed" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
