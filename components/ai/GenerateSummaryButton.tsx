'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AISummaryCard } from './AISummaryCard';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AI_SUMMARY_POLL_INTERVAL_MS,
  AI_SUMMARY_POLL_TIMEOUT_MS,
} from '@/lib/helpers/constants';

interface GenerateSummaryButtonProps {
  projectId: string;
  onSummaryGenerated?: () => void;
}

type SummaryStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface SummaryResult {
  id: string;
  status: SummaryStatus;
  content: string;
  errorMessage: string | null;
  tokenCount: number | null;
  summaryDate: string | null;
  generatedBy: { name: string } | null;
}

const MESSAGES = [
  'Analizando el progreso del equipo...',
  'Identificando patrones de riesgo...',
  'Evaluando bloqueadores críticos...',
  'Construyendo el resumen ejecutivo...',
  'Últimos ajustes...',
];

export function GenerateSummaryButton({
  projectId,
  onSummaryGenerated,
}: GenerateSummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(MESSAGES[0]!);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgIndexRef = useRef(0);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  useEffect(() => () => clearTimers(), []);

  async function pollStatus(summaryId: string) {
    intervalRef.current = setInterval(async () => {
      // Rotar mensaje motivacional
      msgIndexRef.current = (msgIndexRef.current + 1) % MESSAGES.length;
      setLoadingMessage(MESSAGES[msgIndexRef.current]!);

      try {
        const res = await fetch(`/api/ai-summary/status/${summaryId}`);
        if (!res.ok) return;
        const json = await res.json() as { data: SummaryResult };
        const data = json.data;

        if (data.status === 'COMPLETED') {
          clearTimers();
          setIsGenerating(false);
          setResult(data);
          onSummaryGenerated?.();
          toast.success('¡Resumen generado exitosamente!');
        } else if (data.status === 'FAILED') {
          clearTimers();
          setIsGenerating(false);
          toast.error(
            `Error al generar el resumen: ${data.errorMessage ?? 'Error desconocido'}`,
          );
        }
      } catch {
        // Error de red — no interrumpir el polling
      }
    }, AI_SUMMARY_POLL_INTERVAL_MS);

    // Timeout máximo
    timeoutRef.current = setTimeout(() => {
      if (isGenerating) {
        clearTimers();
        setIsGenerating(false);
        toast.error('El resumen tardó demasiado. Intenta nuevamente.');
      }
    }, AI_SUMMARY_POLL_TIMEOUT_MS);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setResult(null);
    msgIndexRef.current = 0;
    setLoadingMessage(MESSAGES[0]!);

    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const json = await res.json() as { data?: { summaryId: string }; error?: string };

      if (res.status === 429) {
        toast.error(json.error ?? 'Límite diario alcanzado');
        setIsGenerating(false);
        return;
      }
      if (res.status === 422) {
        toast.warning('No hay reportes del equipo para hoy.');
        setIsGenerating(false);
        return;
      }
      if (!res.ok || !json.data?.summaryId) {
        toast.error('No se pudo iniciar la generación del resumen.');
        setIsGenerating(false);
        return;
      }

      await pollStatus(json.data.summaryId);
    } catch {
      toast.error('Error de conexión al generar el resumen.');
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <Button disabled className="w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
          Generando...
        </Button>
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground animate-pulse">
            {loadingMessage}
          </p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleGenerate} className="w-full sm:w-auto">
        <Sparkles className="mr-2 h-4 w-4" />
        Generar Resumen con IA
      </Button>

      {result?.status === 'FAILED' && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {result.errorMessage ?? 'Error al generar el resumen'}
        </div>
      )}

      {result?.status === 'COMPLETED' && (
        <AISummaryCard summary={result} isLatest />
      )}
    </div>
  );
}
