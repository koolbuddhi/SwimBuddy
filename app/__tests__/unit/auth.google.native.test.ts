/**
 * Unit tests for lib/auth/google.native.ts.
 * expo-auth-session and expo-web-browser are mocked.
 */

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

const { useAuthRequest: mockUseAuthRequest } = jest.requireMock('expo-auth-session/providers/google') as {
  useAuthRequest: jest.Mock;
};

import { renderHook } from '@testing-library/react-native';
import { useGoogleSignIn } from '../../lib/auth/google.native';

beforeEach(() => jest.clearAllMocks());

describe('useGoogleSignIn', () => {
  it('returns a promptAsync function', () => {
    const promptAsync = jest.fn();
    mockUseAuthRequest.mockReturnValue([{}, { type: 'cancel' }, promptAsync]);
    const { result } = renderHook(() =>
      useGoogleSignIn({ clientId: 'test-client-id', onSuccess: jest.fn() }),
    );
    expect(typeof result.current.promptAsync).toBe('function');
  });

  it('calls onSuccess with credential when response type is success', () => {
    const onSuccess = jest.fn();
    mockUseAuthRequest.mockReturnValue([
      {},
      { type: 'success', params: { id_token: 'fake-id-token' } },
      jest.fn(),
    ]);
    renderHook(() => useGoogleSignIn({ clientId: 'test-client-id', onSuccess }));
    expect(onSuccess).toHaveBeenCalledWith('fake-id-token');
  });

  it('does not call onSuccess when response is not success', () => {
    const onSuccess = jest.fn();
    mockUseAuthRequest.mockReturnValue([{}, { type: 'dismiss' }, jest.fn()]);
    renderHook(() => useGoogleSignIn({ clientId: 'test-client-id', onSuccess }));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
