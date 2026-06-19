import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SwimmerSwitcher } from '../../components/SwimmerSwitcher';

const mockSetSelectedOwnerId = jest.fn();

jest.mock('../../lib/auth', () => ({
  useAuth: () => ({ user: { id: 'me', email: 'me@x', name: 'Me' } }),
}));

jest.mock('../../lib/SessionContext', () => ({
  useSession: () => ({ selectedOwnerId: 'me', setSelectedOwnerId: mockSetSelectedOwnerId }),
}));

const mockUseShares = jest.fn();
jest.mock('../../lib/SharesContext', () => ({
  useShares: () => mockUseShares(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseShares.mockReturnValue({ acceptedIncoming: [] });
});

describe('SwimmerSwitcher', () => {
  it('renders nothing when no shares are accepted', () => {
    render(<SwimmerSwitcher />);
    expect(screen.queryByTestId('swimmer-switcher')).toBeNull();
  });

  it('renders Me chip + a chip per accepted incoming share', () => {
    mockUseShares.mockReturnValue({
      acceptedIncoming: [
        { id: 's1', ownerUserId: 'coach', ownerName: 'Coach K', permission: 'write' },
        { id: 's2', ownerUserId: 'parent', ownerName: 'Parent B', permission: 'read' },
      ],
    });
    render(<SwimmerSwitcher />);
    expect(screen.getByTestId('swimmer-switcher')).toBeTruthy();
    expect(screen.getByTestId('swimmer-chip-me')).toBeTruthy();
    expect(screen.getByTestId('swimmer-chip-coach')).toBeTruthy();
    expect(screen.getByTestId('swimmer-chip-parent')).toBeTruthy();
    expect(screen.getByText('view only')).toBeTruthy();
  });

  it('tapping a chip calls setSelectedOwnerId with that owner id', () => {
    mockUseShares.mockReturnValue({
      acceptedIncoming: [{ id: 's1', ownerUserId: 'coach', ownerName: 'Coach K', permission: 'write' }],
    });
    render(<SwimmerSwitcher />);
    fireEvent.press(screen.getByTestId('swimmer-chip-coach'));
    expect(mockSetSelectedOwnerId).toHaveBeenCalledWith('coach');
  });
});
