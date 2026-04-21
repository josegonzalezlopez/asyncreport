interface ReportEntry {
  userName: string;
  specialization: string;
  yesterday: string;
  today: string;
  blockers?: string | null;
  mood: number;
}

interface PromptContext {
  projectName: string;
  date: string;
  totalMembers: number;
  reportsCount: number;
  reports: ReportEntry[];
}

const MOOD_LABEL: Record<number, string> = {
  1: 'Muy mal (1/5)',
  2: 'Mal (2/5)',
  3: 'Regular (3/5)',
  4: 'Bien (4/5)',
  5: 'Excelente (5/5)',
};

/**
 * Construye el prompt estructurado para Gemini.
 * Función pura — mismos inputs producen siempre el mismo prompt.
 */
export function buildDailySummaryPrompt(ctx: PromptContext): string {
  const moodAvg = (
    ctx.reports.reduce((sum, r) => sum + r.mood, 0) / ctx.reports.length
  ).toFixed(1);

  const noReporters = ctx.totalMembers - ctx.reportsCount;

  const reportsText = ctx.reports
    .map(
      (r, i) => `
### Miembro ${i + 1}: ${r.userName} (${r.specialization})
- **Ayer:** ${r.yesterday}
- **Hoy:** ${r.today}
- **Bloqueadores:** ${r.blockers?.trim() || 'Ninguno'}
- **Mood:** ${MOOD_LABEL[r.mood] ?? r.mood}`,
    )
    .join('\n');

  return `Eres un Tech Lead experto analizando el progreso de un equipo de desarrollo de software. Tu tarea es generar un resumen ejecutivo claro, accionable y conciso basado en los reportes diarios del equipo.

## Contexto
- **Proyecto:** ${ctx.projectName}
- **Fecha:** ${ctx.date}
- **Miembros que reportaron:** ${ctx.reportsCount} de ${ctx.totalMembers} (${noReporters > 0 ? `⚠️ ${noReporters} sin reportar` : '✅ todos reportaron'})
- **Mood promedio del equipo:** ${moodAvg}/5

## Reportes del equipo
${reportsText}

## Instrucciones de análisis
Analiza los reportes anteriores e identifica:
1. Patrones de riesgo o trabajo duplicado entre miembros
2. Dependencias entre tareas que podrían crear cuellos de botella
3. Estado general del equipo basado en el mood y los bloqueadores
4. Bloqueadores críticos que requieren atención inmediata del Tech Lead

## Formato de respuesta requerido
Responde EXCLUSIVAMENTE en el siguiente formato markdown. No agregues información que no esté en los reportes.

## 📋 Resumen Ejecutivo
[2-3 oraciones resumiendo el estado general del equipo hoy]

## ✅ Progreso del Día
[Lista de los avances más relevantes del equipo]

## 🚨 Bloqueadores Críticos
[Lista de bloqueadores o "Ningún bloqueador reportado hoy"]

## ⚠️ Riesgos Identificados
[Dependencias, cuellos de botella o riesgos detectados. Si no hay, indicarlo.]

## 💡 Recomendaciones para el Tech Lead
[Máximo 3 acciones concretas y accionables para hoy]

**Restricciones:** Máximo 400 palabras en total. No inventes información. Sé directo y práctico.`;
}
