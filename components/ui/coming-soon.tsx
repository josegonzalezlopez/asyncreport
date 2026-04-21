import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  phase: string;
}

export function ComingSoon({ title, description, phase }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24 text-center">
        <Construction className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-medium text-muted-foreground">En construcción</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Se implementa en {phase}
        </p>
      </div>
    </div>
  );
}
