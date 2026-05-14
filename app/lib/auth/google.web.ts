// Thin wrappers around the Google Identity Services (GIS) SDK.
// The SDK is loaded via a <script> tag in the HTML shell; this module
// provides typed helpers so callers never touch window.google directly.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }): void;
          prompt(): void;
          renderButton(element: HTMLElement, options: { theme: string; size: string; text?: string }): void;
        };
      };
    };
  }
}

export function initGoogleAuth(
  clientId: string,
  callback: (response: { credential: string }) => void,
): void {
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback,
    auto_select: true,
  });
}

export function promptOneTap(): void {
  window.google!.accounts.id.prompt();
}

export function renderGoogleButton(element: HTMLElement): void {
  window.google!.accounts.id.renderButton(element, {
    theme: 'outline',
    size: 'large',
  });
}
