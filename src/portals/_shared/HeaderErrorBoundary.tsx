import { Component, ReactNode } from 'react';

interface State { hasError: boolean }

/** Prevents a failing header widget (bell, persona query, etc.) from unmounting the entire shell. */
export class HeaderErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error('[shell] header widget crashed', error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
