import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

export default function LAPlaceholder({ title, description }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="border rounded-lg p-12 flex flex-col items-center justify-center text-center bg-card">
        <Construction className="h-10 w-10 text-muted-foreground mb-3" />
        <div className="text-sm font-medium">Coming soon</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          This screen is part of the Legal Advanced framework and will be implemented in a later phase.
        </p>
      </div>
    </div>
  );
}
