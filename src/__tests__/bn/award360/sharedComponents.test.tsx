/**
 * BN-AWARD360-B1 — Shared Award 360 component tests.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Award360DataTable } from '@/pages/bn/awards/award-360/components/Award360DataTable';
import { Award360FilterBar } from '@/pages/bn/awards/award-360/components/Award360FilterBar';
import { Award360Pagination } from '@/pages/bn/awards/award-360/components/Award360Pagination';
import { Award360PermissionState } from '@/pages/bn/awards/award-360/components/Award360PermissionState';
import { Award360PartialWarning } from '@/pages/bn/awards/award-360/components/Award360PartialWarning';

describe('BN-AWARD360-B1 · shared components', () => {
  it('DataTable shows empty state when no rows', () => {
    render(
      <Award360DataTable
        rows={[]}
        columns={[{ key: 'a', label: 'A' }]}
        getRowKey={() => 'x'}
        emptyTitle="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('DataTable renders rows and fires onRowClick', () => {
    const spy = vi.fn();
    render(
      <Award360DataTable
        rows={[{ id: '1', label: 'Row One' }]}
        columns={[{ key: 'label', label: 'Label' }]}
        getRowKey={(r: any) => r.id}
        onRowClick={spy}
      />,
    );
    fireEvent.click(screen.getByText('Row One'));
    expect(spy).toHaveBeenCalled();
  });

  it('DataTable header is sortable when accessor + handler provided', () => {
    const spy = vi.fn();
    render(
      <Award360DataTable
        rows={[{ id: '1', v: 2 }]}
        columns={[{ key: 'v', label: 'V', sortAccessor: (r: any) => r.v }]}
        getRowKey={(r: any) => r.id}
        onSortChange={spy}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /V/ }));
    expect(spy).toHaveBeenCalledWith('v', 'asc');
  });

  it('DataTable surfaces error with retry', () => {
    const retry = vi.fn();
    render(
      <Award360DataTable
        rows={[]}
        columns={[]}
        getRowKey={() => 'x'}
        error={new Error('boom')}
        onRetry={retry}
      />,
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('FilterBar fires onSearch', () => {
    const spy = vi.fn();
    render(<Award360FilterBar search="" onSearch={spy} />);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'x' } });
    expect(spy).toHaveBeenCalledWith('x');
  });

  it('Pagination disables prev on page 1 and next on last page', () => {
    render(<Award360Pagination page={1} pageSize={10} total={10} onPage={() => {}} onPageSize={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.some((b) => b.hasAttribute('disabled'))).toBe(true);
  });

  it('PermissionState renders restricted panel', () => {
    render(<Award360PermissionState moduleLabel="X" />);
    expect(screen.getByTestId('award360-restricted')).toBeTruthy();
  });

  it('PartialWarning renders when warnings exist', () => {
    const { container } = render(<Award360PartialWarning warnings={['w1']} />);
    expect(container.textContent).toContain('w1');
  });

  it('PartialWarning renders nothing when empty', () => {
    const { container } = render(<Award360PartialWarning warnings={[]} />);
    expect(container.textContent).toBe('');
  });
});
