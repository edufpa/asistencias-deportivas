import type { CoachReportContext } from "@/lib/coachReportContext";
import { objectiveStatusLabel } from "@/lib/coachReportObjective";

export type CoachReportAiInput = {
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
  context: CoachReportContext;
};

const DEFAULT_MODEL = "gpt-5.4-mini";

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sanitizeAiHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim();
}

function contextSummary(ctx: CoachReportContext): string {
  const convocados = ctx.convocados.map((p) => p.name).join(", ") || "ninguno";
  const partidos = ctx.matches
    .map((m) => `${m.date} vs ${m.opponent}: ${m.scoreLabel} (${m.outcome})`)
    .join("; ") || "ninguno";
  const stats =
    ctx.playerStats
      .slice(0, 15)
      .map(
        (p) =>
          `${p.name}: ${p.goals}G, ${p.assists}PG, ${p.exclusionsGenerated}exp+, ${p.exclusionsAgainst}exp-, ${p.penaltiesAgainst}pen-`
      )
      .join("; ") || "sin estadísticas";

  return `Convocados (${ctx.convocados.length}): ${convocados}\nPartidos: ${partidos}\nStats: ${stats}`;
}

function buildNarrativePrompt(input: CoachReportAiInput): string {
  const fecha = formatReportDate(input.reportDate);
  const objective = objectiveStatusLabel(input.championshipObjective, input.championshipPosition);

  return `Redacta SOLO el bloque HTML de "Comentarios del cuerpo técnico" para un informe de rugby (Perú).
Máximo 3 párrafos cortos (<p>), cada uno con 1-2 oraciones. Sin tablas, sin listas, sin repetir datos numéricos ya tabulados.

Incluye brevemente:
- Contexto del torneo ${input.convocatoriaName}
- Balance ${input.wins}G/${input.losses}P/${input.draws}E
- ${objective}
- Síntesis de la percepción del entrenador y temas indicados

Datos del entrenador:
Percepción: ${input.coachPerception?.trim() || "(vacío)"}
Tema deportivo: ${input.sportsTopic?.trim() || "(vacío)"}
Tema no deportivo: ${input.nonSportsTopic?.trim() || "(vacío)"}

Referencia (no copiar literal): ${contextSummary(input.context)}

Fecha: ${fecha}
Autor: ${input.coachName}

Responde SOLO con los <p>...</p>, sin títulos ni markdown.`;
}

function buildTopicsPrompt(sportsTopic: string | null | undefined, nonSportsTopic: string | null | undefined): string {
  return `Corrige ortografía y redacta párrafos breves en español (Perú) para un informe deportivo.

Tema deportivo (entrada del entrenador):
${sportsTopic?.trim() || "(vacío)"}

Tema no deportivo (entrada del entrenador):
${nonSportsTopic?.trim() || "(vacío)"}

Reglas:
- Corrige faltas de ortografía y puntuación.
- Cada tema: UN solo <p> con 2-3 oraciones claras que den estructura al texto.
- Mantén el sentido original; no inventes hechos.
- Si un tema está vacío, usa: <p>Sin registro en esta sección.</p>

Responde EXACTAMENTE en este formato (sin markdown):
SPORTS:<p>...</p>
NONSPORTS:<p>...</p>`;
}

function parseTopicsResponse(raw: string): { sportsHtml: string; nonSportsHtml: string } {
  const sportsMatch = raw.match(/SPORTS:\s*(<p>[\s\S]*?<\/p>)/i);
  const nonSportsMatch = raw.match(/NONSPORTS:\s*(<p>[\s\S]*?<\/p>)/i);
  return {
    sportsHtml: sanitizeAiHtml(sportsMatch?.[1] ?? "<p>Sin registro en esta sección.</p>"),
    nonSportsHtml: sanitizeAiHtml(nonSportsMatch?.[1] ?? "<p>Sin registro en esta sección.</p>"),
  };
}

export async function polishReportTopics(
  sportsTopic: string | null | undefined,
  nonSportsTopic: string | null | undefined
): Promise<{ sportsHtml: string; nonSportsHtml: string }> {
  const empty = !(sportsTopic?.trim() || nonSportsTopic?.trim());
  if (empty) {
    return {
      sportsHtml: "<p>Sin registro en esta sección.</p>",
      nonSportsHtml: "<p>Sin registro en esta sección.</p>",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const sports = sportsTopic?.trim()
      ? `<p>${sportsTopic.trim()}</p>`
      : "<p>Sin registro en esta sección.</p>";
    const nonSports = nonSportsTopic?.trim()
      ? `<p>${nonSportsTopic.trim()}</p>`
      : "<p>Sin registro en esta sección.</p>";
    return { sportsHtml: sports, nonSportsHtml: nonSports };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Corriges ortografía y mejoras redacción breve en HTML. Solo etiquetas <p>. No inventes datos.",
        },
        { role: "user", content: buildTopicsPrompt(sportsTopic, nonSportsTopic) },
      ],
    }),
  });

  if (!res.ok) {
    const sports = sportsTopic?.trim()
      ? `<p>${sportsTopic.trim()}</p>`
      : "<p>Sin registro en esta sección.</p>";
    const nonSports = nonSportsTopic?.trim()
      ? `<p>${nonSportsTopic.trim()}</p>`
      : "<p>Sin registro en esta sección.</p>";
    return { sportsHtml: sports, nonSportsHtml: nonSports };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return {
      sportsHtml: sportsTopic?.trim() ? `<p>${sportsTopic.trim()}</p>` : "<p>Sin registro en esta sección.</p>",
      nonSportsHtml: nonSportsTopic?.trim()
        ? `<p>${nonSportsTopic.trim()}</p>`
        : "<p>Sin registro en esta sección.</p>",
    };
  }

  return parseTopicsResponse(raw.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, ""));
}

export async function generateCoachReportNarrative(input: CoachReportAiInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Redactas textos breves y directos para informes deportivos. Solo HTML con etiquetas <p>. Sin inventar datos.",
        },
        { role: "user", content: buildNarrativePrompt(input) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Respuesta vacía de OpenAI");

  const html = raw.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();
  return sanitizeAiHtml(html);
}

/** @deprecated usar generateFullCoachReportHtml */
export async function generateCoachReportPreview(input: CoachReportAiInput): Promise<string> {
  const { buildStructuredReportHtml } = await import("@/lib/coachReportStructuredHtml");
  const narrative = await generateCoachReportNarrative(input);
  return buildStructuredReportHtml({ ...input, narrativeHtml: narrative }, input.context);
}

export async function generateFullCoachReportHtml(input: CoachReportAiInput): Promise<string> {
  const { buildStructuredReportHtml } = await import("@/lib/coachReportStructuredHtml");
  try {
    const [narrative, topics] = await Promise.all([
      generateCoachReportNarrative(input),
      polishReportTopics(input.sportsTopic, input.nonSportsTopic),
    ]);
    return buildStructuredReportHtml(
      {
        ...input,
        narrativeHtml: narrative,
        sportsTopicHtml: topics.sportsHtml,
        nonSportsTopicHtml: topics.nonSportsHtml,
      },
      input.context
    );
  } catch (err) {
    console.error("[coachReport] AI generation failed, using structured only:", err);
    return buildStructuredReportHtml(input, input.context);
  }
}
