import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SharedViewBanner } from '../../components/SharedViewBanner';

const mockSetSelectedOwnerId = jest.fn();

jest.mock('../../lib/auth', () => ({
  useAuth: () => ({ user: { id: 'me', email: 'me@x', name: 'Me' } }),
}));

const mockUseSession = jest.fn();
jest.mock('../../lib/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

const mockUseShares = jest.fn();
jest.mock('../../lib/SharesContext', () => ({
  useShares: () => mockUseShares(),
}));

const baseSession = { selectedOwnerId: 'me', setSelectedOwnerId: mockSetSelectedOwnerId };
const baseShares = { acceptedIncoming: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReturnValue(baseSession);
  mockUseShares.mockReturnValue(baseShares);
});

describe('SharedViewBanner', () => {
  it('renders nothing when viewing own log', () => {
    mockUseSession.mockReturnValue({ ...baseSession, selectedOwnerId: 'me' });
    render(<SharedViewBanner />);
    expect(screen.queryByTestId('shared-view-banner')).toBeNull();
  });

  it('renders nothing when no matching accepted share exists', () => {
    mockUseSession.mockReturnValue({ ...baseSession, selectedOwnerId: 'stranger' });
    mockUseShares.mockReturnValue({ acceptedIncoming: [] });
    render(<SharedViewBanner />);
    expect(screen.queryByTestId('shared-view-banner')).toBeNull();
  });

  it('shows owner name + permission label when viewing a shared log', () => {
    mockUseSession.mockReturnValue({ ...baseSession, selectedOwnerId: 'coach' });
    mockUseShares.mockReturnValue({
      acceptedIncoming: [{ id: 'sh-1', ownerUserId: 'coach', ownerName: 'Coach K', permission: 'read' }],
    });
    render(<SharedViewBanner />);
    expect(screen.getByText(/Coach K/)).toBeTruthy();
    expect(screen.getByText('View only')).toBeTruthy();
  });

  it('renders "You can edit" for write-shares', () => {
    mockUseSession.mockReturnValue({ ...baseSession, selectedOwnerId: 'coach' });
    mockUseShares.mockReturnValue({
      acceptedIncoming: [{ id: 'sh-1', ownerUserId: 'coach', ownerName: 'Coach K', permission: 'write' }],
    });
    render(<SharedViewBanner />);
    expect(screen.getByText('You can edit')).toBeTruthy();
  });

  it('"Back to mine" returns the user to their own log', () => {
    mockUseSession.mockReturnValue({ ...baseSession, selectedOwnerId: 'coach' });
    mockUseShares.mockReturnValue({
      acceptedIncoming: [{ id: 'sh-1', ownerUserId: 'coach', ownerName: 'Coach K', permission: 'write' }],
    });
    render(<SharedViewBanner />);
    fireEvent.press(screen.getByTestId('shared-view-back'));
    expect(mockSetSelectedOwnerId).toHaveBeenCalledWith('me');
  });
});
