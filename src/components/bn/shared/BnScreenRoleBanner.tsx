import { Library, ShieldCheck, FlaskConical, Package, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type BnScreenRole = 'library' | 'governance' | 'simulator' | 'product-assembly' | 'diagnostic';

interface Props {
  role: BnScreenRole;
  description: string;
  /** When true, indicates product-specific setup must instead be done in Product Catalog. */
  productAssemblyHint?: boolean;
  className?: string;
}

const ROLE_META: Record<BnScreenRole, { label: string; icon: any; tone: string }> = {
  library:            { label: 'Library',          icon: Library,       tone: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/30 dark:text-blue-100 dark:border-blue-900' },
  governance:         { label: 'Governance',       icon: ShieldCheck,   tone: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900' },
  simulator:          { label: 'Simulator',        icon: FlaskConical,  tone: 'bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/30 dark:text-purple-100 dark:border-purple-900' },
  'product-assembly': { label: 'Product Assembly', icon: Package,       tone: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900' },
  diagnostic:         { label: 'Diagnostic',       icon: Info,          tone: 'bg-slate-50 text-slate-900 border-slate-200 dark:bg-slate-900/40 dark:text-slate-100 dark:border-slate-700' },
};

export function BnScreenRoleBanner({ role, description, productAssemblyHint, className }: Props) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-sm', meta.tone, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <span className="rounded bg-background/60 px-1.5 py-0.5 text-xs uppercase tracking-wide">{meta.label}</span>
        </div>
        <p className="leading-relaxed">{description}</p>
        {productAssemblyHint && (
          <p className="text-xs opacity-80">
            Product-specific setup is not done here — assemble it inside{' '}
            <Link to="/bn/config/products" className="underline underline-offset-2 font-medium">Product Catalog</Link>.
          </p>
        )}
      </div>
    </div>
  );
}

export default BnScreenRoleBanner;
