"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppRole } from "@/hooks/useAppRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_COLORS,
  EVENT_CATEGORY_DOT,
  EVENT_LOCATION_LABELS,
  ACCESS_LEVEL_LABELS,
  ALL_CATEGORIES,
  ALL_ACCESS_LEVELS,
  ALL_LOCATIONS,
  MIN_MONTH,
  getMaxMonth,
  formatMonthLabel,
  formatTimeRange,
  formatLocationLabel,
  buildGoogleCalendarUrl,
  buildICSContent,
} from "@/lib/calendario";
import { EventCategory, EventAccessLevel, EventLocation } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Table2,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  Filter,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: EventLocation | null;
  locationOther: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  category: EventCategory;
  accessLevels: EventAccessLevel[];
  createdBy: { name: string; email: string };
  createdAt: string;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "" as EventLocation | "",
  locationOther: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  category: "" as EventCategory | "",
  accessLevels: [] as EventAccessLevel[],
};

function getMonthsRange(): string[] {
  const max = getMaxMonth();
  const result: string[] = [];
  let [cy, cm] = MIN_MONTH.split("-").map(Number);
  const [my, mm] = max.split("-").map(Number);
  while (cy < my || (cy === my && cm <= mm)) {
    result.push(`${cy}-${String(cm).padStart(2, "0")}`);
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }
  return result;
}

function getDaysInMonth(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  return { firstDay, daysInMonth, year: y, month: m };
}

// Format ISO date string without UTC offset shift
function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", opts);
}

export default function CalendarioPage() {
  const role = useAppRole();
  const canCreate = role === "SUPER_ADMIN" || role === "COMISION" || role === "COACH";
  const canDelete = role === "SUPER_ADMIN" || role === "COMISION";

  const months = getMonthsRange();
  const currentActualMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const defaultMonth = months.includes(currentActualMonth) ? currentActualMonth : months[0];

  const [activeMonth, setActiveMonth] = useState(defaultMonth);
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<EventCategory | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: activeMonth });
      if (filterCategory) params.set("category", filterCategory);
      const res = await fetch(`/api/calendario?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [activeMonth, filterCategory]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const monthIdx = months.indexOf(activeMonth);

  function openCreate() {
    setEditEvent(null);
    setForm({ ...EMPTY_FORM, startDate: `${activeMonth}-01` });
    setShowForm(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      locationOther: ev.locationOther ?? "",
      startDate: ev.startDate.slice(0, 10),
      endDate: ev.endDate ? ev.endDate.slice(0, 10) : "",
      startTime: ev.startTime ?? "",
      endTime: ev.endTime ?? "",
      category: ev.category,
      accessLevels: ev.accessLevels,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.startDate || !form.category || !form.accessLevels.length) return;
    setSaving(true);
    try {
      const url = editEvent ? `/api/calendario/${editEvent.id}` : "/api/calendario";
      const method = editEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        fetchEvents();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    await fetch(`/api/calendario/${id}`, { method: "DELETE" });
    setSelectedEvent(null);
    fetchEvents();
  }

  function toggleAccessLevel(level: EventAccessLevel) {
    setForm((f) => ({
      ...f,
      accessLevels: f.accessLevels.includes(level)
        ? f.accessLevels.filter((l) => l !== level)
        : [...f.accessLevels, level],
    }));
  }

  function downloadICS(ev: CalendarEvent) {
    const ics = buildICSContent(ev);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group events by day - parse date string directly to avoid UTC offset
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (const ev of events) {
    const day = parseInt(ev.startDate.slice(8, 10), 10);
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  }

  const { firstDay, daysInMonth, year, month } = getDaysInMonth(activeMonth);
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Actividades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Planificación mensual del club</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}>
            <Calendar className="h-4 w-4 mr-1.5" /> Calendario
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            <Table2 className="h-4 w-4 mr-1.5" /> Tabla
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Nueva actividad
            </Button>
          )}
        </div>
      </div>

      {/* Month nav + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={monthIdx <= 0} onClick={() => setActiveMonth(months[monthIdx - 1])}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={activeMonth} onValueChange={(v) => { if (v) setActiveMonth(v); }}>
            <SelectTrigger className="w-48">
              <SelectValue>{formatMonthLabel(activeMonth)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" disabled={monthIdx >= months.length - 1} onClick={() => setActiveMonth(months[monthIdx + 1])}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-0 sm:ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory || "ALL"} onValueChange={(v) => setFilterCategory(!v || v === "ALL" ? "" : (v as EventCategory))}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {filterCategory ? EVENT_CATEGORY_LABELS[filterCategory] : "Todas las categorías"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorías</SelectItem>
              {ALL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{EVENT_CATEGORY_LABELS[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)]">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() + 1 === month &&
                today.getDate() === day;
              const dayEvents = eventsByDay[day] ?? [];
              return (
                <div key={day} className={cn("border-b border-r p-1.5 min-h-[100px]", isToday && "bg-blue-50/60")}>
                  <span className={cn("text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full", isToday ? "bg-primary text-white" : "text-gray-700")}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={cn("w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate", EVENT_CATEGORY_COLORS[ev.category])}
                      >
                        {ev.startTime && <span className="opacity-70 mr-1">{ev.startTime}</span>}
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay actividades en este mes</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead className="w-28">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {fmtDate(ev.startDate, { day: "2-digit", month: "short", year: "numeric" })}
                      {ev.endDate && ev.endDate.slice(0, 10) !== ev.startDate.slice(0, 10) && (
                        <span className="text-muted-foreground"> — {fmtDate(ev.endDate, { day: "2-digit", month: "short" })}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimeRange(ev.startTime, ev.endTime) || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{ev.title}</div>
                      {ev.description && <div className="text-xs text-muted-foreground line-clamp-1">{ev.description}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", EVENT_CATEGORY_COLORS[ev.category])}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", EVENT_CATEGORY_DOT[ev.category])} />
                        {EVENT_CATEGORY_LABELS[ev.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLocationLabel(ev.location, ev.locationOther) || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ev.accessLevels.map((al) => (
                          <Badge key={al} variant="secondary" className="text-xs">{ACCESS_LEVEL_LABELS[al]}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ev.createdBy.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Google Calendar" onClick={() => window.open(buildGoogleCalendarUrl(ev), "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar .ics" onClick={() => downloadICS(ev)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {canCreate && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ev)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <span key={cat} className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border", EVENT_CATEGORY_COLORS[cat])}>
            <span className={cn("h-1.5 w-1.5 rounded-full", EVENT_CATEGORY_DOT[cat])} />
            {EVENT_CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium", EVENT_CATEGORY_COLORS[selectedEvent.category])}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", EVENT_CATEGORY_DOT[selectedEvent.category])} />
                  {EVENT_CATEGORY_LABELS[selectedEvent.category]}
                </span>
              </div>
              <div>
                <span className="font-medium">Fecha: </span>
                {fmtDate(selectedEvent.startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {selectedEvent.endDate && selectedEvent.endDate.slice(0, 10) !== selectedEvent.startDate.slice(0, 10) && (
                  <span> — {fmtDate(selectedEvent.endDate, { day: "numeric", month: "long" })}</span>
                )}
              </div>
              {(selectedEvent.startTime || selectedEvent.endTime) && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatLocationLabel(selectedEvent.location, selectedEvent.locationOther)}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <span className="font-medium">Descripción: </span>
                  {selectedEvent.description}
                </div>
              )}
              <div>
                <span className="font-medium">Visible para: </span>
                {selectedEvent.accessLevels.map((al) => ACCESS_LEVEL_LABELS[al]).join(", ")}
              </div>
              <div>
                <span className="font-medium">Creado por: </span>
                {selectedEvent.createdBy.name}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.open(buildGoogleCalendarUrl(selectedEvent), "_blank")}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Google Calendar
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadICS(selectedEvent)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar .ics
              </Button>
              {canCreate && (
                <Button variant="outline" size="sm" onClick={() => { setSelectedEvent(null); openEdit(selectedEvent); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedEvent.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create / Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Editar actividad" : "Nueva actividad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Nombre de la actividad"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate">Fecha inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  min={`${MIN_MONTH}-01`}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime">Hora inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime">Hora fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  min={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Categoría *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => { if (v) setForm((f) => ({ ...f, category: v as EventCategory })); }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.category
                      ? EVENT_CATEGORY_LABELS[form.category as EventCategory]
                      : <span className="text-muted-foreground">Seleccionar categoría</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{EVENT_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Visible para * (puede seleccionar más de uno)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_ACCESS_LEVELS.map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => toggleAccessLevel(al)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border font-medium transition-colors",
                      form.accessLevels.includes(al)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-300 hover:border-primary"
                    )}
                  >
                    {ACCESS_LEVEL_LABELS[al]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Lugar</Label>
              <Select
                value={form.location || "NONE"}
                onValueChange={(v) => setForm((f) => ({ ...f, location: (!v || v === "NONE") ? "" : v as EventLocation, locationOther: "" }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.location
                      ? EVENT_LOCATION_LABELS[form.location as EventLocation]
                      : <span className="text-muted-foreground">Seleccionar lugar</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin especificar</SelectItem>
                  {ALL_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{EVENT_LOCATION_LABELS[loc]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.location === "OTRO" && (
                <Input
                  className="mt-2"
                  value={form.locationOther}
                  onChange={(e) => setForm((f) => ({ ...f, locationOther: e.target.value }))}
                  placeholder="Especificar lugar"
                />
              )}
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalles adicionales del evento"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.startDate || !form.category || form.accessLevels.length === 0}
            >
              {saving ? "Guardando…" : editEvent ? "Guardar cambios" : "Crear actividad"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
