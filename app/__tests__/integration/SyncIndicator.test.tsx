import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SyncIndicator } from '../../components/SyncIndicator';
import type { SyncStatus } from '../../lib/types';

const make = (partial: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'synced',
  pendingCount: 0,
  lastSyncedAt: null,
  ...partial,
});

describe('SyncIndicator', () => {
  it('shows nothing when synced with 0 pending', () => {
    render(<SyncIndicator status={make()} />);
    expect(screen.queryByTestId('sync-indicator')).toBeNull();
  });

  it('shows pending count when > 0', () => {
    render(<SyncIndicator status={make({ state: 'syncing', pendingCount: 3 })} />);
    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it('shows error state', () => {
    render(<SyncIndicator status={make({ state: 'error', pendingCount: 1, errorMessage: 'Network error' })} />);
    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByText(/error/i)).toBeTruthy();
  });

  it('shows offline state', () => {
    render(<SyncIndicator status={make({ state: 'offline', pendingCount: 2 })} />);
    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });
});
