/**
 * Unit tests for lib/auth/google.web.ts.
 * The GIS SDK (window.google.accounts.id) is mocked globally.
 */

// Provide a minimal GIS mock before importing the module
const mockInitialize = jest.fn();
const mockPrompt = jest.fn();
const mockRenderButton = jest.fn();

Object.defineProperty(globalThis, 'google', {
  value: {
    accounts: {
      id: {
        initialize: mockInitialize,
        prompt: mockPrompt,
        renderButton: mockRenderButton,
      },
    },
  },
  writable: true,
  configurable: true,
});

import { initGoogleAuth, promptOneTap, renderGoogleButton } from '../../lib/auth/google.web';

beforeEach(() => jest.clearAllMocks());

describe('initGoogleAuth', () => {
  it('calls google.accounts.id.initialize with client_id and callback', () => {
    const cb = jest.fn();
    initGoogleAuth('my-client-id', cb);
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'my-client-id', callback: cb }),
    );
  });
});

describe('promptOneTap', () => {
  it('calls google.accounts.id.prompt', () => {
    promptOneTap();
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });
});

describe('renderGoogleButton', () => {
  it('calls google.accounts.id.renderButton with the element and theme', () => {
    const el = {} as HTMLElement;
    renderGoogleButton(el);
    expect(mockRenderButton).toHaveBeenCalledWith(el, expect.objectContaining({ theme: expect.any(String) }));
  });
});
