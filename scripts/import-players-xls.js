/**
 * Importa jugadores desde el Excel de waterpolo.
 * Uso: node scripts/import-players-xls.js "ruta/al/archivo.xls"
 */
require("dotenv").config();
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FEMALE_FIRST_NAMES = new Set([
  "FLORENCIA",
  "MIRANDA",
  "DANIELA",
  "BRISA",
  "LIA",
  "BELEN",
  "MARIA FE",
  "ARELI",
  "ARIANA",
  "VALERIA",
  "VALENTINA",
  "SAMANTHA",
]);

function excelDateToIso(serial) {
  if (!serial || typeof serial !== "number" || Number.isNaN(serial)) return null;
  const date = new Date(Math.round((serial - 25569) * 86400000));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseDocument(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const ceMatch = value.match(/^CE\s*(\d+)/i);
  if (ceMatch) {
    return { documentType: "CARNET_EXTRANJERIA", documentId: ceMatch[1] };
  }

  const passportMatch = value.match(/^pasaporte\s*(.+)$/i);
  if (passportMatch) {
    return { documentType: "PASAPORTE", documentId: passportMatch[1].trim() };
  }

  const digits = value.replace(/\s/g, "");
  if (!digits) return null;
  return { documentType: "DNI", documentId: digits };
}

function detectSectionGender(rowText) {
  const text = String(rowText ?? "").toUpperCase();
  if (text.includes("DAMAS")) return "FEMALE";
  if (text.includes("VARONES") || text.includes("PRE-EQUIPO")) return "MALE";
  return null;
}

function isHeaderRow(row) {
  const joined = row.map((c) => String(c).trim().toUpperCase()).join("|");
  return joined.includes("DNI") && joined.includes("NOMBRES");
}

function isCoachSection(row) {
  return row.some((c) => String(c).trim().toUpperCase() === "ENTRENADORES");
}

function isSectionTitle(row) {
  const text = String(row[1] ?? row[0] ?? "").trim();
  if (!text) return false;
  if (isHeaderRow(row)) return false;
  const upper = text.toUpperCase();
  return (
    upper.includes("PRE-EQUIPO") ||
    upper.includes("VARONES") ||
    upper.includes("DAMAS") ||
    upper.includes("REGATAS WATERPOLO")
  );
}

function parsePlayerRow(row, sectionGender) {
  const num = row[0];
  const rawDoc = row[1];
  const firstName = String(row[2] ?? "").trim();
  const paternalLastName = String(row[3] ?? "").trim();
  const maternalLastName = String(row[4] ?? "").trim();
  const birthSerial = row[5];
  const teamNote = String(row[6] ?? "").trim();
  const extraNote = String(row[7] ?? "").trim();

  if (!firstName || !paternalLastName) return null;
  if (typeof num !== "number" && !rawDoc) return null;

  const doc = parseDocument(rawDoc);
  if (!doc) return null;

  const birthDate = excelDateToIso(birthSerial);
  if (!birthDate) return null;

  let gender = sectionGender ?? "MALE";
  if (sectionGender === "MALE" && FEMALE_FIRST_NAMES.has(firstName.toUpperCase())) {
    gender = "FEMALE";
  }

  const notes = [teamNote, extraNote].filter(Boolean).join(" · ");
  const observations = notes
    ? `Importado Excel WP 17jun26. ${notes}. Actualizar teléfono de contacto.`
    : "Importado Excel WP 17jun26. Actualizar teléfono de contacto.";

  return {
    firstName,
    paternalLastName,
    maternalLastName,
    documentType: doc.documentType,
    documentId: doc.documentId,
    birthDate: new Date(birthDate),
    gender,
    membershipStatus: "NO_ASOCIADO",
    playerStatus: "ACTIVE",
    tutorPhone: "000000000",
    observations,
  };
}

function parseWorksheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let sectionGender = "MALE";
  const players = [];
  const skipped = [];

  for (const row of rows) {
    if (isCoachSection(row)) break;

    if (isSectionTitle(row)) {
      sectionGender = detectSectionGender(row[1]) ?? sectionGender;
      continue;
    }

    if (isHeaderRow(row)) continue;

    const player = parsePlayerRow(row, sectionGender);
    if (player) {
      players.push(player);
      continue;
    }

    const maybeName = String(row[2] ?? "").trim();
    const maybeDoc = String(row[1] ?? "").trim();
    if (maybeName && maybeDoc === "" && typeof row[0] === "number") {
      skipped.push({ row: row[0], name: `${maybeName} ${row[3] ?? ""}`.trim(), reason: "Sin DNI" });
    } else if (maybeName && maybeDoc && !parsePlayerRow(row, sectionGender)) {
      skipped.push({
        row: row[0],
        name: `${maybeName} ${row[3] ?? ""}`.trim(),
        reason: "Fecha de nacimiento inválida o datos incompletos",
      });
    }
  }

  return { players, skipped };
}

async function main() {
  const filePath =
    process.argv[2] ||
    "C:/Users/edufp/Downloads/Equipo & Pre-quipo WP 17jun26 (1).xls";

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const { players, skipped } = parseWorksheet(workbook.Sheets[sheetName]);

  console.log(`📄 Hoja: ${sheetName}`);
  console.log(`👥 Jugadores a importar: ${players.length}`);

  let created = 0;
  let updated = 0;

  for (const data of players) {
    const existing = await prisma.player.findUnique({
      where: { documentId: data.documentId },
    });

    if (existing) {
      await prisma.player.update({
        where: { documentId: data.documentId },
        data: {
          firstName: data.firstName,
          paternalLastName: data.paternalLastName,
          maternalLastName: data.maternalLastName,
          documentType: data.documentType,
          birthDate: data.birthDate,
          gender: data.gender,
          playerStatus: data.playerStatus,
          observations: data.observations,
        },
      });
      updated++;
      console.log(`  ↻ Actualizado: ${data.paternalLastName}, ${data.firstName} (${data.documentId})`);
    } else {
      await prisma.player.create({ data });
      created++;
      console.log(`  + Creado: ${data.paternalLastName}, ${data.firstName} (${data.documentId})`);
    }
  }

  console.log(`\n✅ Listo: ${created} creados, ${updated} actualizados`);

  if (skipped.length > 0) {
    console.log(`\n⚠️  Omitidos (${skipped.length}):`);
    for (const s of skipped) {
      console.log(`  - #${s.row} ${s.name}: ${s.reason}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
