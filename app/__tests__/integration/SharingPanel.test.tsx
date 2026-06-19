import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SharingPanel } from '../../components/SharingPanel';

// ── mocks ─────────────────────────────────────────────────────────────────────
const mockUseShares = jest.fn();

jest.mock('../../lib/SharesContext', () => ({
  useShares: () => mockUseShares(),
}));

const baseValue = {
  outgoing: [],
  incoming: [],
  acceptedIncoming: [],
  loading: false,
  error: null,
  refresh: jest.fn(),
  invite: jest.fn(),
  accept: jest.fn(),
  decline: jest.fn(),
  revoke: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseShares.mockReturnValue(baseValue);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SharingPanel', () => {
  it('renders empty state when no shares exist', () => {
    render(<SharingPanel />);
    expect(screen.getByText("You haven't shared with anyone yet.")).toBeTruthy();
    expect(screen.getByTestId('share-invite-btn')).toBeTruthy();
  });

  it('renders pending incoming invitations with Accept and Decline buttons', () => {
    mockUseShares.mockReturnValue({
      ...baseValue,
      incoming: [{
        id: 'sh-1',
        ownerUserId: 'u-other',
        recipientUserId: 'u-me',
        ownerEmail: 'coach@example.com',
        ownerName: 'Coach K',
        permission: 'write' as const,
        status: 'pending' as const,
        createdAt: 't', acceptedAt: null, revokedAt: null,
      }],
    });
    render(<SharingPanel />);
    expect(screen.getByText('Coach K')).toBeTruthy();
    expect(screen.getByTestId('share-accept-sh-1')).toBeTruthy();
    expect(screen.getByTestId('share-decline-sh-1')).toBeTruthy();
  });

  it('Accept button calls accept(id)', () => {
    const accept = jest.fn();
    mockUseShares.mockReturnValue({
      ...baseValue,
      incoming: [{
        id: 'sh-1',
        ownerUserId: 'u', recipientUserId: 'me',
        ownerEmail: 'a@b', ownerName: 'A',
        permission: 'write' as const, status: 'pending' as const,
        createdAt: 't', acceptedAt: null, revokedAt: null,
      }],
      accept,
    });
    render(<SharingPanel />);
    fireEvent.press(screen.getByTestId('share-accept-sh-1'));
    expect(accept).toHaveBeenCalledWith('sh-1');
  });

  it('opens the invite dialog and submits with the entered email + selected permission', async () => {
    const invite = jest.fn().mockResolvedValue({ id: 'new-share', status: 'pending' });
    mockUseShares.mockReturnValue({ ...baseValue, invite });

    render(<SharingPanel />);
    fireEvent.press(screen.getByTestId('share-invite-btn'));
    expect(screen.getByTestId('share-invite-dialog')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('share-invite-email'), 'friend@example.com');
    fireEvent.press(screen.getByTestId('share-perm-read'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('share-invite-submit'));
    });

    expect(invite).toHaveBeenCalledWith('friend@example.com', 'read');
  });

  it('invite dialog surfaces an error from the API and stays open', async () => {
    const invite = jest.fn().mockRejectedValue(new Error('No user with that email'));
    mockUseShares.mockReturnValue({ ...baseValue, invite });

    render(<SharingPanel />);
    fireEvent.press(screen.getByTestId('share-invite-btn'));
    fireEvent.changeText(screen.getByTestId('share-invite-email'), 'noone@example.com');

    await act(async () => {
      fireEvent.press(screen.getByTestId('share-invite-submit'));
    });

    expect(screen.getByText('No user with that email')).toBeTruthy();
    expect(screen.getByTestId('share-invite-dialog')).toBeTruthy();
  });

  it('rejects empty email submission', async () => {
    const invite = jest.fn();
    mockUseShares.mockReturnValue({ ...baseValue, invite });

    render(<SharingPanel />);
    fireEvent.press(screen.getByTestId('share-invite-btn'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('share-invite-submit'));
    });

    expect(invite).not.toHaveBeenCalled();
    expect(screen.getByText('Enter an email')).toBeTruthy();
  });
});
