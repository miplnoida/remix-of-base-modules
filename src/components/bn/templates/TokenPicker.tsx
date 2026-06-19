/**
 * TokenPicker — grouped, searchable tree of BN template tokens.
 *
 * Two ways to insert into a target field:
 *   1. Drag the token chip and drop it into any subject / body / html-body /
 *      header / footer field. Insertion happens at the drop caret position.
 *   2. Click the chip — inserts at the caret of the most recently focused
 *      target ref (so it works in Subject, Body, or HTML Body, not only the
 *      first one). Falls back to clipboard if no target.
 *
 * The drag payload uses the standard `application/x-bn-token` MIME plus
 * `text/plain` so any contentEditable / textarea drop handler can consume it.
 */
import React, { useMemo, useState } from 'react';
import { TOKEN_GROUPS, TOKEN_REGISTRY } from '@/lib/bn/templateTokens';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Refs to the input(s) the token should be inserted into. */
  targets?: Array<React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>>;
  /** Last-focused element id, set by the editor when fields receive focus. */
  lastFocusedRef?: React.MutableRefObject<HTMLElement | null>;
  onInsert?: (token: string, target?: HTMLTextAreaElement | HTMLInputElement | null) => void;
}

export const TOKEN_DRAG_MIME = 'application/x-bn-token';

export const TokenPicker: React.FC<Props> = ({ targets, lastFocusedRef, onInsert }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TOKEN_REGISTRY;
    return TOKEN_REGISTRY.filter(t =>
      t.key.toLowerCase().includes(needle) ||
      t.label.toLowerCase().includes(needle)
    );
  }, [q]);

  const insertInto = (target: HTMLTextAreaElement | HTMLInputElement, token: string) => {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const next = target.value.slice(0, start) + token + target.value.slice(end);
    const proto = target instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(target, next);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    const caret = start + token.length;
    target.setSelectionRange(caret, caret);
  };

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const last = lastFocusedRef?.current as HTMLTextAreaElement | HTMLInputElement | null;
    const target =
      (last && (last instanceof HTMLTextAreaElement || last instanceof HTMLInputElement)) ? last :
      (targets?.find(r => r.current && document.activeElement === r.current)?.current
        ?? targets?.find(r => r.current)?.current ?? null);
    if (target) {
      insertInto(target, token);
      onInsert?.(token, target);
    } else if (onInsert) {
      onInsert(token);
    } else {
      navigator.clipboard.writeText(token).then(() => toast.success(`Copied ${token}`));
    }
  };

  const onDragStart = (e: React.DragEvent, key: string) => {
    const token = `{{${key}}}`;
    e.dataTransfer.setData(TOKEN_DRAG_MIME, token);
    e.dataTransfer.setData('text/plain', token);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="border rounded-md flex flex-col h-full min-h-0">
      <div className="p-2 border-b space-y-1">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search variables…"
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-muted-foreground px-0.5">
          Drag into any field, or click to insert at the cursor.
        </p>
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
                    draggable
                    onDragStart={(e) => onDragStart(e, t.key)}
                    onClick={() => insert(t.key)}
                    title={`Drag or click to insert {{${t.key}}}\n${t.description ?? t.label}`}
                    className="w-full text-left px-2 py-1 rounded hover:bg-accent flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
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

/**
 * Attach drag-and-drop token insertion to a textarea/input element.
 * Returns props to spread on the field. The token is inserted at the drop
 * caret position (or at the current selection on browsers that don't expose
 * `caretPositionFromPoint`).
 */
export function useTokenDrop(onInsert?: (token: string, target?: HTMLTextAreaElement | HTMLInputElement | null) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(TOKEN_DRAG_MIME) || e.dataTransfer.types.includes('text/plain')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    onDrop: (e: React.DragEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const token = e.dataTransfer.getData(TOKEN_DRAG_MIME) || e.dataTransfer.getData('text/plain');
      if (!token) return;
      e.preventDefault();
      const target = e.currentTarget;
      // Best-effort caret-at-point; fall back to current selection.
      let pos = target.selectionStart ?? target.value.length;
      const docAny = document as any;
      try {
        if (typeof docAny.caretPositionFromPoint === 'function') {
          const cp = docAny.caretPositionFromPoint(e.clientX, e.clientY);
          if (cp && cp.offsetNode === target) pos = cp.offset;
        } else if (typeof docAny.caretRangeFromPoint === 'function') {
          const r = docAny.caretRangeFromPoint(e.clientX, e.clientY);
          if (r && r.startContainer === target) pos = r.startOffset;
        }
      } catch { /* ignore */ }
      const next = target.value.slice(0, pos) + token + target.value.slice(pos);
      const proto = target instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(target, next);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      onInsert?.(token, target);
      target.focus();
      const caret = pos + token.length;
      target.setSelectionRange(caret, caret);
    },
  };
}

export default TokenPicker;
