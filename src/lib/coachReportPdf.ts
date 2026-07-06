import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 28;

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u00b7/g, " - ")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToPlain(html: string): string {
  return sanitizePdfText(
    decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<li>/gi, "- ")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    )
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        if (line) lines.push(line);
        line = word.length > maxChars ? word.slice(0, maxChars) : word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

type PdfCtx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
};

function newPage(ctx: PdfCtx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y - needed < MARGIN + 20) newPage(ctx);
}

function drawParagraph(ctx: PdfCtx, text: string, size = 9): void {
  for (const line of wrapLines(text, 92)) {
    ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: CONTENT_W,
    });
    ctx.y -= size + 4;
  }
  ctx.y -= 4;
}

function drawHeading(ctx: PdfCtx, title: string): void {
  ensureSpace(ctx, 20);
  ctx.page.drawText(sanitizePdfText(title.toUpperCase()), {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: ctx.fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  ctx.y -= 16;
}

function colWidthsFor(cols: number): number[] {
  const base = Math.floor(CONTENT_W / cols);
  const widths = Array.from({ length: cols }, () => base);
  widths[cols - 1] += CONTENT_W - base * cols;
  return widths;
}

function wrapTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const test = chunk + ch;
        if (font.widthOfTextAtSize(test, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = test;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function computeColWidths(headers: string[], cols: number): number[] {
  const h0 = (headers[0] ?? "").toLowerCase();

  if (cols === 6 && h0.includes("jugador")) {
    const statW = 52;
    const playerW = CONTENT_W - statW * 5;
    return [playerW, statW, statW, statW, statW, statW];
  }

  if (cols === 5 && h0.includes("fecha")) {
    const widths = [68, 118, 52, 52, 0];
    widths[4] = CONTENT_W - widths.slice(0, 4).reduce((a, b) => a + b, 0);
    return widths;
  }

  if (cols === 2 && (h0 === "#" || h0.includes("jugador"))) {
    return [36, CONTENT_W - 36];
  }

  return colWidthsFor(cols);
}

function drawTable(ctx: PdfCtx, headers: string[], rows: string[][]): void {
  const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const widths = computeColWidths(headers, cols);
  const fontSize = cols > 4 ? 7 : 8;
  const lineGap = 2;
  const cellPadX = 3;
  const cellPadY = 4;

  const colX = (index: number) => MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0);

  const drawRow = (cells: string[], bold: boolean) => {
    const f = bold ? ctx.fontBold : ctx.font;
    const padded = Array.from({ length: cols }, (_, i) => sanitizePdfText(cells[i] ?? ""));
    const cellLines = padded.map((cell, i) =>
      wrapTextToWidth(cell, f, fontSize, widths[i] - cellPadX * 2)
    );
    const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
    const rowH = maxLines * (fontSize + lineGap) + cellPadY * 2;

    ensureSpace(ctx, rowH);
    const topY = ctx.y;

    for (let i = 0; i < cols; i++) {
      let lineY = topY - cellPadY - fontSize;
      for (const line of cellLines[i]) {
        ctx.page.drawText(line, {
          x: colX(i) + cellPadX,
          y: lineY,
          size: fontSize,
          font: f,
          color: rgb(0.15, 0.15, 0.15),
        });
        lineY -= fontSize + lineGap;
      }
    }

    ctx.y = topY - rowH;
  };

  drawRow(headers, true);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 2 },
    end: { x: MARGIN + CONTENT_W, y: ctx.y + 2 },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });

  for (const row of rows) drawRow(row, false);
  ctx.y -= 8;
}

function parseHtmlTable(tableHtml: string): { headers: string[]; rows: string[][] } {
  const headers = [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
    htmlToPlain(m[1])
  );
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) =>
      [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((td) => htmlToPlain(td[1]))
    )
    .filter((row) => row.length > 0);
  return { headers, rows };
}

type ReportSection = {
  title: string;
  html: string;
};

function parseReportSections(html: string): {
  title: string;
  metaLines: string[];
  sections: ReportSection[];
  signature: string;
} {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? htmlToPlain(titleMatch[1]) : "INFORME DEL ENTRENADOR";

  const metaMatch = html.match(/<p[^>]*class="report-meta"[^>]*>([\s\S]*?)<\/p>/i);
  const metaLines = metaMatch
    ? htmlToPlain(metaMatch[1])
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const footerMatch = html.match(/<footer[^>]*class="report-signature"[^>]*>([\s\S]*?)<\/footer>/i);
  const signature = footerMatch ? htmlToPlain(footerMatch[1]) : "";

  const body = html.replace(/<footer[\s\S]*$/i, "");
  const sections: ReportSection[] = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches = [...body.matchAll(h2Re)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;
    sections.push({
      title: htmlToPlain(m[1]),
      html: body.slice(start, end).trim(),
    });
  }

  return { title, metaLines, sections, signature };
}

function renderSection(ctx: PdfCtx, section: ReportSection): void {
  drawHeading(ctx, section.title);

  const tableMatch = section.html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    const { headers, rows } = parseHtmlTable(tableMatch[0]);
    if (headers.length > 0 && rows.length > 0) {
      drawTable(ctx, headers, rows);
    } else {
      drawParagraph(ctx, "Sin datos.");
    }
    const rest = section.html.replace(/<table[\s\S]*?<\/table>/i, "").trim();
    if (rest) drawParagraph(ctx, htmlToPlain(rest));
    return;
  }

  const text = htmlToPlain(section.html);
  drawParagraph(ctx, text || "Sin registro.");
}

async function renderReportHtmlToPdf(html: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: PdfCtx = { doc, page: doc.addPage([PAGE_W, PAGE_H]), font, fontBold, y: PAGE_H - MARGIN };

  const { title, metaLines, sections, signature } = parseReportSections(html);

  ctx.page.drawText(sanitizePdfText(title), {
    x: MARGIN,
    y: ctx.y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  ctx.y -= 22;

  for (const line of metaLines) {
    drawParagraph(ctx, line, 9);
  }
  ctx.y -= 4;

  for (const section of sections) {
    renderSection(ctx, section);
  }

  if (signature) {
    ensureSpace(ctx, 60);
    ctx.y -= 8;
    drawParagraph(ctx, signature, 9);
  }

  for (const p of doc.getPages()) {
    p.drawText("Regatas Lima - Asistencias Deportivas", {
      x: MARGIN,
      y: FOOTER_Y,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return doc.save();
}

/** Genera el PDF a partir del mismo HTML que muestra la vista previa en pantalla. */
export async function buildCoachReportPdfFromHtml(html: string): Promise<Uint8Array> {
  return renderReportHtmlToPdf(html);
}
