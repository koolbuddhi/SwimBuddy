import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SessionScreen } from '../../components/SessionScreen';
import type { Session } from '../../lib/types';

// ── mock SessionContext ────────────────────────────────────────────────────────
jest.mock('../../lib/SessionContext', () => ({
  useSession: jest.fn(),
}));

const { useSession: mockUseSession } = jest.requireMock('../../lib/SessionContext') as {
  useSession: jest.Mock;
};

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  date: '2026-05-13',
  notes: '',
  drills: [
    { id: 'd1', strokeId: 'fly', distance: 25, timeCs: 1845, label: 'sprint', createdAt: '' },
    { id: 'd2', strokeId: 'back', distance: 50, timeCs: 3600, label: '', createdAt: '' },
  ],
  groups: [],
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
  ...overrides,
});

const mockContext = (session: Session) => {
  const addDrill = jest.fn().mockResolvedValue(undefined);
  const updateDrill = jest.fn().mockResolvedValue(undefined);
  const deleteDrill = jest.fn().mockResolvedValue(undefined);
  const deleteSession = jest.fn().mockResolvedValue(undefined);
  mockUseSession.mockReturnValue({
    sessions: [session],
    addDrill,
    updateDrill,
    deleteDrill,
    deleteSession,
    createSession: jest.fn(),
  });
  return { addDrill, updateDrill, deleteDrill, deleteSession };
};

describe('SessionScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a DrillRow for each drill', () => {
    const session = makeSession();
    mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getAllByTestId('drill-row-main').length).toBe(2);
  });

  it('renders empty state when session has no drills', () => {
    const session = makeSession({ drills: [] });
    mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getByTestId('session-empty-state')).toBeTruthy();
  });

  it('calls deleteDrill when drill delete button is pressed', async () => {
    const session = makeSession();
    const { deleteDrill } = mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    const deleteBtns = screen.getAllByTestId('drill-delete-btn');
    await act(async () => { fireEvent.press(deleteBtns[0]); });
    expect(deleteDrill).toHaveBeenCalledWith('s1', 'd1');
  });

  it('add FAB exists', () => {
    mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getByTestId('session-add-fab')).toBeTruthy();
  });

  it('delete session button exists', () => {
    mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getByTestId('session-delete-btn')).toBeTruthy();
  });

  it('shows Alert and calls deleteSession on confirm', async () => {
    const session = makeSession();
    const { deleteSession } = mockContext(session);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // simulate pressing the destructive "Delete" button
      const confirmBtn = buttons?.find((b) => b.style === 'destructive');
      confirmBtn?.onPress?.();
    });
    const onBack = jest.fn();
    render(<SessionScreen sessionId="s1" onBack={onBack} />);
    await act(async () => { fireEvent.press(screen.getByTestId('session-delete-btn')); });
    expect(alertSpy).toHaveBeenCalled();
    expect(deleteSession).toHaveBeenCalledWith('s1');
    expect(onBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
