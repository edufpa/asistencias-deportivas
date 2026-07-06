export function CoachReportAiPreview({
  html,
  loading,
}: {
  html: string | null;
  loading?: boolean;
  /** @deprecated el informe completo viene en html */
  fallback?: unknown;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground animate-pulse">
        Generando vista previa...
      </div>
    );
  }

  if (html) {
    return (
      <div
        className="coach-report-preview rounded-xl border bg-white p-4 sm:p-6 shadow-sm overflow-x-auto
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-2
          [&_.report-meta]:text-sm [&_.report-meta]:text-slate-500 [&_.report-meta]:mb-4 [&_.report-meta]:border-b [&_.report-meta]:pb-3
          [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wide
          [&_.report-summary]:text-sm [&_.report-summary]:text-slate-700
          [&_.report-objective]:text-sm [&_.report-objective]:mb-2
          [&_p]:text-sm [&_p]:text-slate-700 [&_p]:leading-relaxed [&_p]:mb-2
          [&_.report-empty]:text-sm [&_.report-empty]:text-slate-500 [&_.report-empty]:italic
          [&_.report-table]:w-full [&_.report-table]:text-xs [&_.report-table]:border-collapse [&_.report-table]:mb-2
          [&_.report-table-stats]:table-fixed [&_.report-table-stats]:min-w-[560px]
          [&_.report-table-stats_th:not(:first-child)]:text-center [&_.report-table-stats_td:not(:first-child)]:text-center
          [&_.report-table-stats_th:not(:first-child)]:whitespace-nowrap [&_.report-table-stats_td:not(:first-child)]:whitespace-nowrap
          [&_.report-table_th]:text-left [&_.report-table_th]:bg-slate-100 [&_.report-table_th]:px-2 [&_.report-table_th]:py-1.5 [&_.report-table_th]:border [&_.report-table_th]:border-slate-200
          [&_.report-table_td]:px-2 [&_.report-table_td]:py-1.5 [&_.report-table_td]:border [&_.report-table_td]:border-slate-200
          [&_.report-total]:bg-slate-50
          [&_.report-signature]:mt-8 [&_.report-signature]:pt-4 [&_.report-signature]:border-t [&_.report-signature]:border-slate-200 [&_.report-signature]:text-right [&_.report-signature_p]:text-sm
          [&_footer]:mt-8 [&_footer]:pt-4 [&_footer]:border-t [&_footer]:border-slate-200 [&_footer]:text-right [&_footer_p]:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-muted-foreground text-sm">
      Completa el formulario y genera la vista previa para ver convocados, partidos y estadísticas.
    </div>
  );
}
