import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SessionCard } from '../../components/SessionCard';
import type { Session } from '../../lib/types';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  date: '2026-05-13',
  notes: '',
  drills: [
    { id: 'd1', strokeId: 'fly',  distance: 25, timeCs: 1845, label: '', createdAt: '' },
    { id: 'd2', strokeId: 'back', distance: 25, timeCs: 2210, label: '', createdAt: '' },
  ],
  groups: [],
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
  ...overrides,
});

describe('SessionCard', () => {
  it('calls onClick when card is pressed', () => {
    const onClick = jest.fn();
    render(<SessionCard session={makeSession()} onClick={onClick} />);
    fireEvent.press(screen.getByTestId('session-card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows "Today" for today\'s date', () => {
    const today = new Date().toLocaleDateString('en-CA');
    render(<SessionCard session={makeSession({ date: today })} onClick={jest.fn()} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows formatted date for old sessions', () => {
    render(<SessionCard session={makeSession({ date: '2024-01-15' })} onClick={jest.fn()} />);
    // should contain "Jan" somewhere
    expect(screen.getByText(/Jan/)).toBeTruthy();
  });

  it('shows drill count', () => {
    render(<SessionCard session={makeSession()} onClick={jest.fn()} />);
    expect(screen.getByText(/2 drills/)).toBeTruthy();
  });

  it('uses singular "drill" for 1 drill', () => {
    const s = makeSession({ drills: [makeSession().drills[0]] });
    render(<SessionCard session={s} onClick={jest.fn()} />);
    expect(screen.getByText('1 drill')).toBeTruthy();
  });

  it('shows total time when drills exist', () => {
    // 1845 + 2210 = 4055 cs = 00:40.55
    render(<SessionCard session={makeSession()} onClick={jest.fn()} />);
    expect(screen.getByText('00:40.55')).toBeTruthy();
  });

  it('hides total time when no drills', () => {
    render(<SessionCard session={makeSession({ drills: [] })} onClick={jest.fn()} />);
    expect(screen.queryByTestId('session-total')).toBeNull();
  });

  it('shows best group row when groups exist', () => {
    const session = makeSession({
      groups: [{ id: 'g1', name: 'IM Attempt 1', drillIds: ['d1', 'd2'], createdAt: '' }],
    });
    render(<SessionCard session={session} onClick={jest.fn()} />);
    expect(screen.getByText(/IM Attempt 1/)).toBeTruthy();
  });

  it('hides best group row when no groups', () => {
    render(<SessionCard session={makeSession({ groups: [] })} onClick={jest.fn()} />);
    expect(screen.queryByTestId('best-group-row')).toBeNull();
  });
});
