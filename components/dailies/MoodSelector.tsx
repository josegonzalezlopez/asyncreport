'use client';

import { cn } from '@/lib/utils';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Excelente' },
];

interface Props {
  value: number;
  onChange: (v: number) => void;
  error?: string;
}

export function MoodSelector({ value, onChange, error }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        ¿Cómo te sentiste hoy? <span className="text-destructive">*</span>
      </label>
      <div className="flex gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            title={mood.label}
            onClick={() => onChange(mood.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-2xl transition-all',
              'hover:border-primary/50 hover:bg-primary/5',
              value === mood.value
                ? 'border-primary bg-primary/10 scale-110'
                : 'border-border bg-background/50',
            )}
          >
            {mood.emoji}
            <span className="text-[10px] text-muted-foreground">{mood.label}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
