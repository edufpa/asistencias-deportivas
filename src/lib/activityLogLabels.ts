export const ACTION_LABEL: Record<string, string> = {
  PLAYER_CREATED: "Jugador creado",
  PLAYER_UPDATED: "Jugador editado",
  PLAYER_DELETED: "Jugador eliminado",
  PLAYER_CUT: "Corte de jugador",
  CONV_CREATED: "Convocatoria creada",
  CONV_UPDATED: "Convocatoria editada",
  CONV_DELETED: "Convocatoria eliminada",
  MATCH_CREATED: "Partido creado",
  MATCH_UPDATED: "Partido editado",
  MATCH_DELETED: "Partido eliminado",
  ATTENDANCE_SAVED: "Asistencia guardada",
  TEST_CREATED: "Test creado",
  TEST_UPDATED: "Test editado",
  TEST_DELETED: "Test eliminado",
  EVAL_CREATED: "Marca de test registrada",
  EVAL_UPDATED: "Marca de test editada",
  EVAL_DELETED: "Marca de test eliminada",
  USER_CREATED: "Usuario creado",
  USER_DELETED: "Usuario eliminado",
  USER_UPDATED: "Usuario editado",
  USER_STATUS_CHANGED: "Estado de usuario cambiado",
  USER_PLAYER_LINKS_SYNC: "Vínculos usuario-jugador",
};

export const ACTION_COLOR: Record<string, string> = {
  PLAYER_CREATED: "bg-green-100 text-green-800",
  PLAYER_UPDATED: "bg-blue-100 text-blue-800",
  PLAYER_DELETED: "bg-red-100 text-red-800",
  PLAYER_CUT: "bg-orange-100 text-orange-800",
  CONV_CREATED: "bg-purple-100 text-purple-800",
  CONV_UPDATED: "bg-purple-50 text-purple-900",
  CONV_DELETED: "bg-red-50 text-red-800",
  MATCH_CREATED: "bg-yellow-100 text-yellow-900",
  MATCH_UPDATED: "bg-yellow-50 text-yellow-900",
  MATCH_DELETED: "bg-red-50 text-red-800",
  ATTENDANCE_SAVED: "bg-teal-100 text-teal-800",
  TEST_CREATED: "bg-cyan-100 text-cyan-900",
  TEST_UPDATED: "bg-cyan-50 text-cyan-900",
  TEST_DELETED: "bg-red-50 text-red-800",
  EVAL_CREATED: "bg-sky-100 text-sky-900",
  EVAL_UPDATED: "bg-sky-50 text-sky-900",
  EVAL_DELETED: "bg-red-50 text-red-800",
  USER_CREATED: "bg-indigo-100 text-indigo-800",
  USER_DELETED: "bg-red-100 text-red-800",
  USER_UPDATED: "bg-indigo-50 text-indigo-900",
  USER_STATUS_CHANGED: "bg-amber-100 text-amber-900",
  USER_PLAYER_LINKS_SYNC: "bg-slate-100 text-slate-800",
};

export function getActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, " ").toLowerCase();
}

export function getActionColor(action: string): string {
  return ACTION_COLOR[action] ?? "bg-gray-100 text-gray-700";
}
