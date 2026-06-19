import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { SettingsScreen } from '../../components/SettingsScreen';

jest.mock('../../lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('../../lib/SessionContext', () => ({ useSession: jest.fn() }));
// The Sharing panel renders inside Settings. Stub its hook so these tests
// don't need the SharesProvider tree.
jest.mock('../../lib/SharesContext', () => ({
  useShares: () => ({
    outgoing: [], incoming: [], acceptedIncoming: [],
    loading: false, error: null,
    refresh: jest.fn(), invite: jest.fn(), accept: jest.fn(),
    decline: jest.fn(), revoke: jest.fn(),
  }),
}));

const { useAuth: mockUseAuth } = jest.requireMock('../../lib/auth') as { useAuth: jest.Mock };
const { useSession: mockUseSession } = jest.requireMock('../../lib/SessionContext') as { useSession: jest.Mock };

const session = {
  id: 's1', date: '2026-05-13', notes: '', drills: [], groups: [],
  createdAt: '', updatedAt: '',
};

const signOut = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'uid-1', email: 'coach@example.com', name: 'Coach Joe' },
    signOut,
  });
  mockUseSession.mockReturnValue({ sessions: [session] });
});

describe('SettingsScreen', () => {
  it('shows user email', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('coach@example.com')).toBeTruthy();
  });

  it('shows sign out button', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-signout-btn')).toBeTruthy();
  });

  it('calls signOut when sign-out pressed', async () => {
    render(<SettingsScreen />);
    await act(async () => { fireEvent.press(screen.getByTestId('settings-signout-btn')); });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('shows export buttons', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('export-csv-btn')).toBeTruthy();
    expect(screen.getByTestId('export-json-btn')).toBeTruthy();
  });
});
