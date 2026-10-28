import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpAuthContext } from "@/lib/mcp/oauth";
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
} from "@/lib/mcp/tools";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/lib/mcp/tools-calendar";
import {
  getAttendanceSessionRecords,
  listAttendanceSessions,
  updateAttendance,
  updateAttendanceBatch,
} from "@/lib/mcp/tools-attendance";
import {
  createPlayer,
  deletePlayer,
  getPlayerDetail,
  listPlayers,
  updatePlayer,
} from "@/lib/mcp/tools-players-crud";

const categoryEnum = z.enum(["SUB10", "SUB12", "SUB14", "SUB16", "SUB18", "OPEN", "MASTER"]);
const sessionTypeEnum = z.enum(["TURNO_MANANA", "TURNO_TARDE", "PESAS"]);
const attendanceStatusEnum = z.enum(["ATTENDED", "ABSENT_JUSTIFIED", "ABSENT_UNJUSTIFIED"]);
const eventCategoryEnum = z.enum([
  "TORNEO",
  "PARTIDO_PRACTICA",
  "INSCRIPCION",
  "CONGRESILLO",
  "PAGO_INSCRIPCION",
  "REUNION_PAPAS",
  "REUNION_ENTRENADORES",
  "REUNION_COMISION",
  "OTRAS",
]);
const eventLocationEnum = z.enum(["MEET", "OFICINA", "SALON_NAUTICO", "OTRO"]);
const eventAccessEnum = z.enum(["COMISION", "COACH", "PARENT"]);

const playerInputSchema = {
  firstName: z.string().optional(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional(),
  documentType: z.enum(["DNI", "PASAPORTE", "CARNET_EXTRANJERIA"]).optional(),
  documentId: z.string().optional(),
  birthDate: z.string().optional().describe("YYYY-MM-DD"),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  membershipStatus: z.enum(["ASOCIADO", "NO_ASOCIADO"]).optional(),
  membershipCardNumber: z.string().optional(),
  federationCode: z.string().optional(),
  playerStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  teamJoinDate: z.string().optional().describe("YYYY-MM-DD"),
  homeAddress: z.string().optional(),
  contactPhone: z.string().optional(),
  playerEmail: z.string().optional(),
  fatherName: z.string().optional(),
  fatherEmail: z.string().optional(),
  fatherPhone: z.string().optional(),
  motherName: z.string().optional(),
  motherEmail: z.string().optional(),
  motherPhone: z.string().optional(),
  tutorName: z.string().optional(),
  tutorEmail: z.string().optional(),
  tutorPhone: z.string().optional(),
  educationalCenter: z.string().optional(),
  educationLevel: z.string().optional(),
  absencePermissionContact: z.string().optional(),
  medicalInfo: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  epsInsurance: z.string().optional(),
  observations: z.string().optional(),
};

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

export function createAsistenciasMcpServer(ctx: McpAuthContext): McpServer {
  const server = new McpServer({
    name: "asistencias",
    version: "1.2.0",
  });

  server.registerTool(
    "dashboard_stats",
    { description: "Resumen general del club: jugadores, convocatorias y cortes recientes." },
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
      description: "Lista convocatorias con filtros opcionales.",
      inputSchema: {
        status: z.enum(["ACTIVE", "CLOSED"]).optional(),
        category: categoryEnum.optional(),
        gender: z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
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
      description: "Detalle de convocatoria con jugadores activos.",
      inputSchema: { convocatoriaId: z.string().min(1) },
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
      description: "Busca jugadores por nombre o documento (rápido).",
      inputSchema: {
        query: z.string().min(1),
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
      description: "Ficha resumida de jugador con asistencia reciente.",
      inputSchema: {
        playerId: z.string().min(1),
        attendanceDays: z.number().int().min(1).max(365).optional(),
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
    "list_players",
    {
      description:
        "Listado de jugadores con búsqueda opcional. Respeta permisos del usuario autenticado.",
      inputSchema: {
        search: z.string().optional(),
        includeConvocatorias: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args) => {
      try {
        return textResult(await listPlayers(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_player_detail",
    {
      description: "Ficha completa de jugador con convocatorias. Oculta datos sensibles según rol.",
      inputSchema: { playerId: z.string().min(1) },
    },
    async (args) => {
      try {
        return textResult(await getPlayerDetail(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "create_player",
    {
      description:
        "Crea un jugador. Requiere rol comisión. Campos obligatorios: firstName, paternalLastName, documentId, birthDate y teléfono de papá/mamá/tutor.",
      inputSchema: playerInputSchema,
    },
    async (args) => {
      try {
        return textResult(await createPlayer(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "update_player",
    {
      description:
        "Actualiza un jugador existente. Requiere rol comisión. Enviar todos los campos obligatorios del jugador.",
      inputSchema: {
        playerId: z.string().min(1),
        ...playerInputSchema,
      },
    },
    async (args) => {
      try {
        return textResult(await updatePlayer(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "delete_player",
    {
      description: "Elimina un jugador. Solo comisión/delegado/super admin.",
      inputSchema: { playerId: z.string().min(1) },
    },
    async (args) => {
      try {
        return textResult(await deletePlayer(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "list_calendar_events",
    {
      description: "Lista eventos del calendario visibles para el usuario autenticado.",
      inputSchema: {
        month: z.string().optional().describe("Filtrar por mes YYYY-MM"),
        category: eventCategoryEnum.optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        return textResult(await listCalendarEvents(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_calendar_event",
    {
      description: "Detalle de un evento del calendario por ID.",
      inputSchema: { eventId: z.string().min(1) },
    },
    async (args) => {
      try {
        return textResult(await getCalendarEvent(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "create_calendar_event",
    {
      description:
        "Crea evento en calendario. Requiere comisión, delegado, entrenador o super admin.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        location: eventLocationEnum.optional(),
        locationOther: z.string().optional(),
        startDate: z.string().describe("YYYY-MM-DD"),
        endDate: z.string().optional().describe("YYYY-MM-DD"),
        startTime: z.string().optional().describe("HH:MM"),
        endTime: z.string().optional().describe("HH:MM"),
        category: eventCategoryEnum,
        accessLevels: z.array(eventAccessEnum).min(1),
      },
    },
    async (args) => {
      try {
        return textResult(await createCalendarEvent(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "update_calendar_event",
    {
      description: "Actualiza un evento del calendario.",
      inputSchema: {
        eventId: z.string().min(1),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        location: eventLocationEnum.nullable().optional(),
        locationOther: z.string().nullable().optional(),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        category: eventCategoryEnum.optional(),
        accessLevels: z.array(eventAccessEnum).optional(),
      },
    },
    async (args) => {
      try {
        return textResult(await updateCalendarEvent(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "delete_calendar_event",
    {
      description: "Elimina un evento del calendario. Solo comisión/delegado/super admin.",
      inputSchema: { eventId: z.string().min(1) },
    },
    async (args) => {
      try {
        return textResult(await deleteCalendarEvent(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "attendance_summary",
    {
      description: "Resumen de asistencia por categoría y género.",
      inputSchema: {
        category: categoryEnum,
        gender: z.enum(["MALE", "FEMALE"]),
        days: z.number().int().optional(),
        convocatoriaId: z.string().optional(),
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
        return textResult(await listAttendanceSessions(ctx, args));
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
        return textResult(await getAttendanceSessionRecords(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "update_attendance",
    {
      description:
        "Marca asistencia de un jugador en una sesión. Requiere permiso de edición de asistencias.",
      inputSchema: {
        ...sessionLocatorSchema,
        playerId: z.string().min(1),
        status: attendanceStatusEnum,
        absenceReason: z.string().optional().describe("Motivo si está ausente"),
      },
    },
    async (args) => {
      try {
        return textResult(await updateAttendance(ctx, args));
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
        return textResult(await updateAttendanceBatch(ctx, args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "list_matches",
    {
      description: "Lista partidos de una convocatoria.",
      inputSchema: {
        convocatoriaId: z.string().min(1),
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
      description: "Estadísticas individuales de un partido.",
      inputSchema: { matchId: z.string().min(1) },
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
      description: "Lista informes del entrenador.",
      inputSchema: {
        convocatoriaId: z.string().optional(),
        status: z.enum(["DRAFT", "FINAL", "SENT"]).optional(),
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
      description: "Detalle de un informe del entrenador.",
      inputSchema: { informeId: z.string().min(1) },
    },
    async (args) => {
      try {
        return textResult(await getInforme(args));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  return server;
}
