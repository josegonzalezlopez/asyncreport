'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Cpu, Clock, Coins } from 'lucide-react';

interface AISummaryCardProps {
  summary: {
    id: string;
    content: string;
    summaryDate: string | Date | null;
    tokenCount: number | null;
    generatedBy: { name: string } | null;
  };
  isLatest?: boolean;
  isCollapsed?: boolean;
}

/** Renderiza el contenido markdown del resumen de IA como texto formateado. */
function MarkdownContent({ content }: { content: string }) {
  // Parseo básico de markdown a JSX sin dependencias externas
  const lines = content.split('\n');

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="text-base font-semibold mt-4 mb-1 first:mt-0">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="text-sm font-medium mt-3 mb-1">
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^[-*] /, '');
          return (
            <li key={i} className="ml-4 list-disc text-muted-foreground">
              {renderInline(text)}
            </li>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="text-muted-foreground">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

/** Aplica estilos inline para **bold** y *italic*. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function AISummaryCard({
  summary,
  isLatest = false,
}: AISummaryCardProps) {
  const date = summary.summaryDate
    ? new Date(summary.summaryDate).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <Card className={isLatest ? 'border-primary/50 shadow-md' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Resumen Ejecutivo
            {isLatest && (
              <Badge variant="default" className="text-xs">
                Más reciente
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {summary.tokenCount && (
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {summary.tokenCount.toLocaleString()} tokens
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {date}
            </span>
            {summary.generatedBy && (
              <span className="text-muted-foreground">
                por {summary.generatedBy.name}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <MarkdownContent content={summary.content} />
      </CardContent>
    </Card>
  );
}
