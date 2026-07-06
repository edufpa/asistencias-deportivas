import type { CoachReportContext } from "@/lib/coachReportContext";
import { formatReportDate } from "@/lib/coachReportAi";
import { objectiveStatusLabel } from "@/lib/coachReportObjective";

export type StructuredReportInput = {
  convocatoriaName: string;
  coachName: string;
  reportDate: Date;
  wins: number;
  losses: number;
  draws: number;
  championshipObjective?: number | null;
  championshipPosition?: string | null;
  coachPerception?: string | null;
  sportsTopic?: string | null;
  nonSportsTopic?: string | null;
  narrativeHtml?: string | null;
  sportsTopicHtml?: string | null;
  nonSportsTopicHtml?: string | null;
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brief(text: string | null | undefined, empty = "Sin registro."): string {
  const t = (text || "").trim();
  return t ? esc(t) : empty;
}

function buildConvocadosTable(ctx: CoachReportContext): string {
  if (ctx.convocados.length === 0) {
    return "<p class=\"report-empty\">No hay jugadores convocados activos.</p>";
  }
  const rows = ctx.convocados
    .map(
      (p) =>
        `<tr><td>${p.capNumber ?? "—"}</td><td>${esc(p.name)}</td></tr>`
    )
    .join("");
  return `<table class="report-table"><thead><tr><th>#</th><th>Jugador</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildMatchesTable(ctx: CoachReportContext): string {
  if (ctx.matches.length === 0) {
    return "<p class=\"report-empty\">No hay partidos registrados.</p>";
  }
  const rows = ctx.matches
    .map((m) => {
      const outcome =
        m.outcome === "G" ? "Ganado" : m.outcome === "P" ? "Perdido" : m.outcome === "E" ? "Empate" : "Pendiente";
      return `<tr>
        <td>${esc(m.date)}</td>
        <td>${esc(m.opponent)}</td>
        <td>${esc(m.matchType)}</td>
        <td>${esc(m.scoreLabel)}</td>
        <td>${outcome}</td>
      </tr>`;
    })
    .join("");
  return `<table class="report-table"><thead><tr><th>Fecha</th><th>Rival</th><th>Tipo</th><th>Marcador</th><th>Resultado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildStatsTable(ctx: CoachReportContext): string {
  if (ctx.playerStats.length === 0) {
    return "<p class=\"report-empty\">No hay estadísticas individuales cargadas en los partidos.</p>";
  }
  const rows = ctx.playerStats
    .map(
      (p) =>
        `<tr>
          <td>${esc(p.name)}</td>
          <td>${p.goals}</td>
          <td>${p.assists}</td>
          <td>${p.exclusionsGenerated}</td>
          <td>${p.exclusionsAgainst}</td>
          <td>${p.penaltiesAgainst}</td>
        </tr>`
    )
    .join("");
  const t = ctx.teamTotals;
  const footer = `<tr class="report-total">
    <td><strong>Total equipo</strong></td>
    <td><strong>${t.goals}</strong></td>
    <td><strong>${t.assists}</strong></td>
    <td><strong>${t.exclusionsGenerated}</strong></td>
    <td><strong>${t.exclusionsAgainst}</strong></td>
    <td><strong>${t.penaltiesAgainst}</strong></td>
  </tr>`;
  return `<table class="report-table report-table-stats">
    <colgroup>
      <col style="width:34%" />
      <col style="width:11%" />
      <col style="width:11%" />
      <col style="width:11%" />
      <col style="width:11%" />
      <col style="width:11%" />
    </colgroup>
    <thead><tr>
    <th>Jugador</th><th>Goles</th><th>Pases gol</th><th>Exp. gen.</th><th>Exp. con.</th><th>Pen. con.</th>
  </tr></thead><tbody>${rows}${footer}</tbody></table>`;
}

const STATS_SECTION_RE =
  /(<h2[^>]*>\s*Estad(?:í|i)sticas acumuladas\s*<\/h2>\s*)([\s\S]*?)(?=\s*<h2|\s*<footer|$)/i;

/** Reemplaza la tabla de stats en HTML guardado (p. ej. encabezados viejos en BD). */
export function refreshDynamicTablesInReportHtml(html: string, ctx: CoachReportContext): string {
  if (!html?.trim()) return html;
  if (!STATS_SECTION_RE.test(html)) return html;
  return html.replace(STATS_SECTION_RE, `$1${buildStatsTable(ctx)}\n\n  `);
}

export function buildStructuredReportHtml(
  input: StructuredReportInput,
  ctx: CoachReportContext
): string {
  const fecha = formatReportDate(input.reportDate);
  const objectiveLine = objectiveStatusLabel(input.championshipObjective, input.championshipPosition);
  const positionLine = input.championshipPosition?.trim()
    ? `Puesto alcanzado: <strong>${esc(input.championshipPosition.trim())}</strong>`
    : "Puesto alcanzado: sin registrar";

  const narrative = input.narrativeHtml?.trim()
    ? input.narrativeHtml
    : `<p>${brief(input.coachPerception)}</p>`;

  return `<article>
  <h1>INFORME DEL ENTRENADOR</h1>
  <p class="report-meta">
    <strong>${esc(input.convocatoriaName)}</strong><br/>
    <strong>Fecha de generación:</strong> ${fecha}<br/>
    <strong>Autor:</strong> ${esc(input.coachName)}
  </p>

  <h2>Resumen</h2>
  <p class="report-summary">${input.wins} ganados · ${input.losses} perdidos · ${input.draws} empates · ${ctx.matches.length} partidos</p>
  <p class="report-objective"><strong>${esc(objectiveLine)}</strong> — ${positionLine}</p>

  <h2>Jugadores convocados</h2>
  ${buildConvocadosTable(ctx)}

  <h2>Resultados por partido</h2>
  ${buildMatchesTable(ctx)}

  <h2>Estadísticas acumuladas</h2>
  ${buildStatsTable(ctx)}

  <h2>Comentarios del cuerpo técnico</h2>
  ${narrative}

  <h2>Tema deportivo</h2>
  ${input.sportsTopicHtml?.trim() ?? `<p>${brief(input.sportsTopic)}</p>`}

  <h2>Tema no deportivo</h2>
  ${input.nonSportsTopicHtml?.trim() ?? `<p>${brief(input.nonSportsTopic)}</p>`}

  <footer class="report-signature">
    <p>Atentamente,</p>
    <p><strong>${esc(input.coachName)}</strong></p>
    <p>Entrenador / Cuerpo técnico</p>
    <p>Regatas Lima — Asistencias Deportivas</p>
  </footer>
</article>`;
}
