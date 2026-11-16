# MCP Asistencias — Regatas Lima

Servidor [Model Context Protocol](https://modelcontextprotocol.io) para consultar datos de **Asistencias Deportivas** desde Cursor.

## Autenticación con token en la URL (recomendado — simple)

Generá un link personal desde **Mi cuenta → MCP con token en la URL** en la app. El token viaja en el path:

`https://regatas.tecvi.ai/api/mcp/t/<tu-token>`

También funciona como query: `https://regatas.tecvi.ai/api/mcp?token=<tu-token>`.

Config en `.cursor/mcp.json` (pegá la URL completa que te muestra la app):

```json
{
  "mcpServers": {
    "asistencias": {
      "url": "https://regatas.tecvi.ai/api/mcp/t/rt_XXXXXXXX"
    }
  }
}
```

- El token se muestra **una sola vez** al crearlo; después solo ves un prefijo.
- Podés revocar tokens desde la misma pantalla.
- Cada token actúa con los permisos de tu usuario (cuenta aprobada).

### Alternativa: OAuth (producción)

El MCP remoto también soporta **OAuth con tu login** (email + contraseña):

1. En Cursor → **Settings → MCP**, el servidor `asistencias` aparece con botón **Connect**.
2. Cursor abre el navegador en la página de login de Regatas Lima.
3. Ingresás tu **email y contraseña** (la misma cuenta de la web).
4. Tras autorizar, el navegador redirige a Cursor (`cursor://...`) y queda conectado.
5. Cursor renueva el token automáticamente.

```json
{
  "mcpServers": {
    "asistencias": {
      "url": "https://regatas.tecvi.ai/api/mcp"
    }
  }
}
```

Para desarrollo local (OAuth o `?token=`):

```json
{
  "mcpServers": {
    "asistencias": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Requisitos en el servidor

- `NEXTAUTH_URL` o `MCP_BASE_URL` configurada (ej. `https://regatas.tecvi.ai`)
- Tablas OAuth + `mcp_url_tokens` creadas: `npx prisma db push`

## Modo local sin login (solo desarrollo)

El paquete `mcp/` con stdio conecta directo a PostgreSQL vía `DATABASE_URL` **sin autenticación de usuario**. Úsalo solo en tu máquina de desarrollo, no en producción.

```json
{
  "mcpServers": {
    "asistencias-local": {
      "command": "node",
      "args": ["mcp/dist/index.js"],
      "cwd": "${workspaceFolder}/asistencias"
    }
  }
}
```

## Herramientas disponibles

### Consultas generales

| Tool | Descripción |
|------|-------------|
| `dashboard_stats` | Resumen: jugadores, convocatorias, últimos cortes |
| `list_convocatorias` | Lista convocatorias con filtros |
| `get_convocatoria` | Detalle + jugadores activos |
| `search_players` | Buscar jugador por nombre o DNI |
| `get_player` | Ficha + asistencia reciente |
| `attendance_summary` | Reporte de asistencia por categoría/género |
| `list_matches` | Partidos de una convocatoria |
| `get_match_stats` | Estadísticas individuales de un partido |
| `list_informes` | Informes del entrenador |
| `get_informe` | Detalle de un informe |

Estados de informe: `DRAFT`, `FINAL`, `SENT`.

### Calendario (CRUD)

| Tool | Descripción | Permisos |
|------|-------------|----------|
| `list_calendar_events` | Lista eventos visibles para tu rol | Todos (filtrado por acceso) |
| `get_calendar_event` | Detalle de un evento | Según `accessLevels` |
| `create_calendar_event` | Crear evento | Comisión, delegado, entrenador, super admin |
| `update_calendar_event` | Editar evento | Comisión, delegado, entrenador, super admin |
| `delete_calendar_event` | Eliminar evento | Comisión, delegado, super admin |

Categorías: `TORNEO`, `PARTIDO_PRACTICA`, `INSCRIPCION`, `CONGRESILLO`, `PAGO_INSCRIPCION`, `REUNION_PAPAS`, `REUNION_ENTRENADORES`, `REUNION_COMISION`, `OTRAS`.

Ubicaciones: `MEET`, `OFICINA`, `SALON_NAUTICO`, `OTRO`.

Niveles de acceso: `COMISION`, `COACH`, `PARENT`.

### Jugadores (CRUD)

| Tool | Descripción | Permisos |
|------|-------------|----------|
| `list_players` | Listado con búsqueda opcional | Comisión, delegado, entrenador, super admin, padres (solo vinculados) |
| `get_player_detail` | Ficha completa con convocatorias | Igual que arriba |
| `create_player` | Crear jugador | Comisión, delegado, super admin |
| `update_player` | Editar jugador | Comisión, delegado, super admin |
| `delete_player` | Eliminar jugador | Comisión, delegado, super admin |

### Asistencia (lectura y escritura)

| Tool | Descripción | Permisos |
|------|-------------|----------|
| `list_attendance_sessions` | Lista sesiones por categoría o convocatoria | Todos |
| `get_attendance_session_records` | Registros actuales de una sesión | Todos |
| `update_attendance` | Marcar asistencia de un jugador | Entrenador, comisión autorizada, pesas |
| `update_attendance_batch` | Marcar asistencia de varios jugadores (lote) | Igual que arriba |

Estados de asistencia: `ATTENDED`, `ABSENT_JUSTIFIED`, `ABSENT_UNJUSTIFIED`.

Turnos (`sessionType`): `TURNO_MANANA` (Piscina 1), `TURNO_TARDE` (Piscina 2), `PESAS`.

Para ubicar la sesión podés usar `sessionId` o `sessionDate` + `sessionType` + `category` (planilla por categoría) o `convocatoriaId` (torneo).

> Las operaciones de escritura respetan los mismos permisos que la app web. Requiere cuenta aprobada en el club.

## Instalación del MCP remoto

El servidor HTTP vive en la app Next.js (`/api/mcp`). Solo hay que desplegar la app y ejecutar migraciones:

```bash
cd asistencias
npx prisma db push
npm run build
```

## Instalación del MCP stdio (opcional)

```bash
cd asistencias/mcp
npm install
npm run build
```

## Endpoints OAuth

| Endpoint | Uso |
|----------|-----|
| `/.well-known/oauth-authorization-server` | Metadata OAuth |
| `/.well-known/oauth-protected-resource/api/mcp` | Metadata del recurso MCP |
| `/api/mcp/oauth/authorize` | Login + autorización |
| `/api/mcp/oauth/token` | Intercambio de tokens |
| `/api/mcp/oauth/register` | Registro dinámico de Cursor |
