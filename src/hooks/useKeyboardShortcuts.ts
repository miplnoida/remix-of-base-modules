import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

/**
 * Global keyboard shortcuts hook.
 * Shortcuts are suppressed when focus is in an input/textarea/select.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      // Don't fire in contenteditable
      if ((e.target as HTMLElement)?.isContentEditable) return;

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}

/** Standard shortcuts catalog */
export const KB_SHORTCUTS = {
  HELP: { key: '/', ctrl: false, shift: true, description: 'Open screen help (Shift+/)' },
  SEARCH: { key: 'k', ctrl: true, shift: false, description: 'Search help (Ctrl+K)' },
  FAQ: { key: 'f', ctrl: false, shift: false, alt: true, description: 'Toggle FAQ panel (Alt+F)' },
  ADD: { key: 'n', ctrl: false, shift: false, alt: true, description: 'Add new item (Alt+N)' },
} as const;
