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
  const saveGroup = jest.fn().mockResolvedValue(undefined);
  const ungroupGroup = jest.fn().mockResolvedValue(undefined);
  const removeGroup = jest.fn().mockResolvedValue(undefined);
  const updateSession = jest.fn().mockResolvedValue(undefined);
  mockUseSession.mockReturnValue({
    sessions: [session],
    addDrill,
    updateDrill,
    deleteDrill,
    deleteSession,
    saveGroup,
    ungroupGroup,
    removeGroup,
    updateSession,
    createSession: jest.fn(),
  });
  return { addDrill, updateDrill, deleteDrill, deleteSession, saveGroup, ungroupGroup, removeGroup, updateSession };
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

  it('shows Alert and calls deleteDrill when the destructive button is pressed', async () => {
    const session = makeSession();
    const { deleteDrill } = mockContext(session);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    const deleteBtns = screen.getAllByTestId('drill-delete-btn');
    await act(async () => { fireEvent.press(deleteBtns[0]); });
    expect(alertSpy).toHaveBeenCalled();
    expect(deleteDrill).toHaveBeenCalledWith('s1', 'd1');
    alertSpy.mockRestore();
  });

  it('cancels delete without calling deleteDrill when Cancel is pressed', async () => {
    const session = makeSession();
    const { deleteDrill } = mockContext(session);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'cancel')?.onPress?.();
    });
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getAllByTestId('drill-delete-btn')[0]); });
    expect(deleteDrill).not.toHaveBeenCalled();
    alertSpy.mockRestore();
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

  // ── Group wiring (T14) ────────────────────────────────────────────────────────

  it('selecting a drill shows the SelectionBar', () => {
    mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    fireEvent.press(screen.getAllByTestId('drill-row-main')[0]);
    expect(screen.getByText(/1 selected/)).toBeTruthy();
  });

  it('SelectionBar shows correct total time for selected drills', () => {
    mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    // select d1 (1845 cs) — time appears in DrillRow AND SelectionBar
    fireEvent.press(screen.getAllByTestId('drill-row-main')[0]);
    expect(screen.getAllByText('00:18.45').length).toBeGreaterThanOrEqual(2);
  });

  it('calls saveGroup with selected drillIds and name', async () => {
    const { saveGroup } = mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    // select both drills
    fireEvent.press(screen.getAllByTestId('drill-row-main')[0]);
    fireEvent.press(screen.getAllByTestId('drill-row-main')[1]);
    // tap "Group" button in SelectionBar
    fireEvent.press(screen.getByTestId('selection-save-btn'));
    // type group name and confirm
    fireEvent.changeText(screen.getByTestId('group-name-input'), 'Sprint Set');
    await act(async () => { fireEvent.press(screen.getByTestId('group-name-confirm-btn')); });
    expect(saveGroup).toHaveBeenCalledWith('s1', 'Sprint Set', expect.arrayContaining(['d1', 'd2']));
  });

  it('renders GroupContainer for existing groups', () => {
    const session = makeSession({
      groups: [{ id: 'g1', name: 'IM Set', drillIds: ['d1', 'd2'], createdAt: '' }],
    });
    mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getByText('IM Set')).toBeTruthy();
    expect(screen.getByTestId('group-header')).toBeTruthy();
  });

  it('calls ungroupGroup when group ungroup button pressed', async () => {
    const session = makeSession({
      groups: [{ id: 'g1', name: 'IM Set', drillIds: ['d1', 'd2'], createdAt: '' }],
    });
    const { ungroupGroup } = mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getByTestId('group-ungroup-btn')); });
    expect(ungroupGroup).toHaveBeenCalledWith('s1', 'g1');
  });

  it('calls removeGroup when group remove button pressed', async () => {
    const session = makeSession({
      groups: [{ id: 'g1', name: 'IM Set', drillIds: ['d1', 'd2'], createdAt: '' }],
    });
    const { removeGroup } = mockContext(session);
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getByTestId('group-remove-btn')); });
    expect(removeGroup).toHaveBeenCalledWith('s1', 'g1');
  });

  it('clearing selection via SelectionBar hides it', () => {
    mockContext(makeSession());
    render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
    fireEvent.press(screen.getAllByTestId('drill-row-main')[0]);
    fireEvent.press(screen.getByTestId('selection-clear-btn'));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  describe('date editor', () => {
    it('tapping the date title opens the editor pre-filled with the current date', () => {
      mockContext(makeSession({ date: '2026-05-13' }));
      render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
      fireEvent.press(screen.getByTestId('session-date-btn'));
      expect(screen.getByTestId('date-edit-input').props.value).toBe('2026-05-13');
    });

    it('saving a valid date calls updateSession with the new date', async () => {
      const { updateSession } = mockContext(makeSession({ date: '2026-05-13' }));
      render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
      fireEvent.press(screen.getByTestId('session-date-btn'));
      fireEvent.changeText(screen.getByTestId('date-edit-input'), '2026-04-30');
      await act(async () => { fireEvent.press(screen.getByTestId('date-edit-save')); });
      expect(updateSession).toHaveBeenCalledWith('s1', expect.any(Function));
      // Run the updater on a dummy session to verify it sets date
      const updater = updateSession.mock.calls[0][1];
      expect(updater({ date: '2026-05-13' })).toEqual({ date: '2026-04-30' });
    });

    it('Save is disabled for malformed date and does not call updateSession', async () => {
      const { updateSession } = mockContext(makeSession({ date: '2026-05-13' }));
      render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
      fireEvent.press(screen.getByTestId('session-date-btn'));
      fireEvent.changeText(screen.getByTestId('date-edit-input'), 'not-a-date');
      const saveBtn = screen.getByTestId('date-edit-save');
      expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
      await act(async () => { fireEvent.press(saveBtn); });
      expect(updateSession).not.toHaveBeenCalled();
    });

    it('cancel closes the modal without calling updateSession', () => {
      const { updateSession } = mockContext(makeSession());
      render(<SessionScreen sessionId="s1" onBack={jest.fn()} />);
      fireEvent.press(screen.getByTestId('session-date-btn'));
      fireEvent.press(screen.getByTestId('date-edit-cancel'));
      expect(updateSession).not.toHaveBeenCalled();
    });
  });
});
