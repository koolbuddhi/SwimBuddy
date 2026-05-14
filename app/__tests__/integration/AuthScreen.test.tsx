import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { AuthScreen } from '../../components/AuthScreen';

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(),
}));

const { useAuth: mockUseAuth } = jest.requireMock('../../lib/auth') as {
  useAuth: jest.Mock;
};

describe('AuthScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a sign-in button', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, signIn: jest.fn(), signOut: jest.fn() });
    render(<AuthScreen />);
    expect(screen.getByTestId('auth-signin-btn')).toBeTruthy();
  });

  it('shows loading indicator while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, signIn: jest.fn(), signOut: jest.fn() });
    render(<AuthScreen />);
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
  });
});
