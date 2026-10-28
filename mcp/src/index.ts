#!/usr/bin/env node
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { disconnectDb } from "./db.js";
import {
  attendanceSummary,
  dashboardStats,
  getConvocatoria,
  getInforme,
  getMatchStats,
  getPlayer,
  listConvocatorias,
  listInformes,
  listMatches,
  searchPlayers,
} from "./tools.js";
import {
  getAttendanceSessionRecords,
  listAttendanceSessions,
  updateAttendance,
  updateAttendanceBatch,
} from "./tools-attendance.js";

const server = new McpServer({
  name: "asistencias",
  version: "1.1.0",
});

const categoryEnum = z.enum(["SUB10", "SUB12", "SUB14", "SUB16", "SUB18", "OPEN", "MASTER"]);
const sessionTypeEnum = z.enum(["TURNO_MANANA", "TURNO_TARDE", "PESAS"]);
const attendanceStatusEnum = z.enum(["ATTENDED", "ABSENT_JUSTIFIED", "ABSENT_UNJUSTIFIED"]);

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}

server.registerTool(
  "dashboard_stats",
  {
    description:
      "Resumen general del club: total de jugadores, convocatorias activas y últimos cortes de convocatoria.",
  },
  async () => {
    try {
      return textResult(await dashboardStats());
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "list_convocatorias",
  {
    description:
      "Lista convocatorias del club. Puede filtrar por estado (ACTIVE/CLOSED), categoría o género.",
    inputSchema: {
      status: z.enum(["ACTIVE", "CLOSED"]).optional().describe("Estado de la convocatoria"),
      category: categoryEnum.optional(),
      gender: z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
      limit: z.number().int().min(1).max(100).optional().describe("Máximo de resultados"),
    },
  },
  async (args) => {
    try {
      return textResult(await listConvocatorias(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_convocatoria",
  {
    description:
      "Detalle de una convocatoria por ID: jugadores activos, staff asignado y conteos de partidos/sesiones.",
    inputSchema: {
      convocatoriaId: z.string().min(1).describe("ID de la convocatoria"),
    },
  },
  async (args) => {
    try {
      return textResult(await getConvocatoria(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "search_players",
  {
    description:
      "Busca jugadores por nombre, apellido o documento. Devuelve datos básicos y categoría calculada.",
    inputSchema: {
      query: z.string().min(1).describe("Texto a buscar (nombre, apellido o DNI)"),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (args) => {
    try {
      return textResult(await searchPlayers(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_player",
  {
    description:
      "Ficha de un jugador por ID: datos personales, convocatorias activas y resumen de asistencia reciente.",
    inputSchema: {
      playerId: z.string().min(1).describe("ID del jugador"),
      attendanceDays: z.number().int().min(1).max(365).optional().describe("Días hacia atrás"),
    },
  },
  async (args) => {
    try {
      return textResult(await getPlayer(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "attendance_summary",
  {
    description:
      "Resumen de asistencia por categoría y género en un periodo. Similar al reporte de /reportes.",
    inputSchema: {
      category: categoryEnum,
      gender: z.enum(["MALE", "FEMALE"]),
      days: z.number().int().optional().describe("Días hacia atrás (default 30)"),
      convocatoriaId: z.string().optional().describe("Opcional: filtrar por convocatoria"),
    },
  },
  async (args) => {
    try {
      return textResult(await attendanceSummary(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

const sessionLocatorSchema = {
  sessionId: z.string().optional().describe("ID de la sesión (alternativa a fecha+turno)"),
  sessionDate: z.string().optional().describe("YYYY-MM-DD (si no usás sessionId)"),
  sessionType: sessionTypeEnum.optional(),
  category: categoryEnum.optional().describe("Requerido para planilla por categoría"),
  convocatoriaId: z.string().optional().describe("Para sesiones de convocatoria/torneo"),
};

server.registerTool(
  "list_attendance_sessions",
  {
    description:
      "Lista sesiones de asistencia por categoría o convocatoria. Útil para obtener sessionId antes de actualizar.",
    inputSchema: {
      category: categoryEnum.optional(),
      convocatoriaId: z.string().optional(),
      sessionDate: z.string().optional().describe("Filtrar por fecha YYYY-MM-DD"),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) => {
    try {
      return textResult(await listAttendanceSessions(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_attendance_session_records",
  {
    description: "Registros de asistencia de una sesión (estado actual de cada jugador marcado).",
    inputSchema: sessionLocatorSchema,
  },
  async (args) => {
    try {
      return textResult(await getAttendanceSessionRecords(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "update_attendance",
  {
    description: "Marca asistencia de un jugador en una sesión.",
    inputSchema: {
      ...sessionLocatorSchema,
      playerId: z.string().min(1),
      status: attendanceStatusEnum,
      absenceReason: z.string().optional().describe("Motivo si está ausente"),
    },
  },
  async (args) => {
    try {
      return textResult(await updateAttendance(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "update_attendance_batch",
  {
    description:
      "Marca asistencia de varios jugadores en una sesión (lote). Opcionalmente limpia registros con clearPlayerIds.",
    inputSchema: {
      ...sessionLocatorSchema,
      records: z
        .array(
          z.object({
            playerId: z.string().min(1),
            status: attendanceStatusEnum,
            absenceReason: z.string().optional(),
          })
        )
        .min(1),
      clearPlayerIds: z.array(z.string()).optional(),
    },
  },
  async (args) => {
    try {
      return textResult(await updateAttendanceBatch(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "list_matches",
  {
    description: "Lista partidos de una convocatoria con marcador y tipo (oficial/práctica).",
    inputSchema: {
      convocatoriaId: z.string().min(1).describe("ID de la convocatoria"),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) => {
    try {
      return textResult(await listMatches(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_match_stats",
  {
    description:
      "Estadísticas individuales de un partido (goles, expulsiones, penales, asistencias, etc.).",
    inputSchema: {
      matchId: z.string().min(1).describe("ID del partido"),
    },
  },
  async (args) => {
    try {
      return textResult(await getMatchStats(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "list_informes",
  {
    description: "Lista informes del entrenador (coach reports) con estado y convocatoria asociada.",
    inputSchema: {
      convocatoriaId: z.string().optional(),
      status: z.enum(["DRAFT", "FINAL", "SENT"]).optional().describe("Estado del informe"),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) => {
    try {
      return textResult(await listInformes(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_informe",
  {
    description:
      "Detalle de un informe del entrenador: resumen de resultados, posición en campeonato y temas registrados.",
    inputSchema: {
      informeId: z.string().min(1).describe("ID del informe"),
    },
  },
  async (args) => {
    try {
      return textResult(await getInforme(args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(async (err) => {
  console.error("[asistencias-mcp] fatal:", err);
  await disconnectDb();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await disconnectDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDb();
  process.exit(0);
});
