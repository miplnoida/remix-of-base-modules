/**
 * TokenPicker — grouped tree of BN template tokens. Click a token to insert
 * it at the caret of a textarea/input referenced by `targetRef`. Falls back
 * to copying to clipboard when no target is provided.
 */
import React, { useMemo, useState } from 'react';
import { TOKEN_GROUPS, TOKEN_REGISTRY, type TokenGroup } from '@/lib/bn/templateTokens';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Refs to the input(s) the token should be inserted into. */
  targets?: Array<React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>>;
  onInsert?: (token: string) => void;
}

export const TokenPicker: React.FC<Props> = ({ targets, onInsert }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TOKEN_REGISTRY;
    return TOKEN_REGISTRY.filter(t =>
      t.key.toLowerCase().includes(needle) || t.label.toLowerCase().includes(needle)
    );
  }, [q]);

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    // Find the most-recently-focused target ref; fallback to first.
    const target = targets?.find(r => r.current && document.activeElement === r.current)?.current
      ?? targets?.find(r => r.current)?.current ?? null;
    if (target) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const next = target.value.slice(0, start) + token + target.value.slice(end);
      // Set via native setter so React picks the change up.
      const proto = target instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(target, next);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();
      const caret = start + token.length;
      target.setSelectionRange(caret, caret);
    } else if (onInsert) {
      onInsert(token);
    } else {
      navigator.clipboard.writeText(token).then(() => toast.success(`Copied ${token}`));
    }
  };

  return (
    <div className="border rounded-md flex flex-col h-full min-h-0">
      <div className="p-2 border-b">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tokens…" className="h-8 text-xs" />
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-3">
        {TOKEN_GROUPS.map((g) => {
          const items = filtered.filter(t => t.group === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background py-1">
                <Badge variant="secondary" className="text-[10px] uppercase">{g.label}</Badge>
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-0.5">
                {items.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => insert(t.key)}
                    title={`Insert {{${t.key}}}`}
                    className="w-full text-left px-2 py-1 rounded hover:bg-accent flex items-center gap-2 group"
                  >
                    <code className="text-[11px] font-mono text-primary">{`{{${t.key}}}`}</code>
                    <span className="text-[11px] text-muted-foreground truncate flex-1">{t.label}</span>
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <p className="text-xs text-muted-foreground text-center py-6">No tokens match.</p>
        )}
      </div>
    </div>
  );
};

export default TokenPicker;
