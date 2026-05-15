// Thin wrappers around the Google Identity Services (GIS) SDK.
// The SDK is loaded via a <script> tag in the HTML shell; this module
// provides typed helpers so callers never touch window.google directly.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            ux_mode?: 'popup' | 'redirect';
            login_uri?: string;
            use_fedcm_for_prompt?: boolean;
          }): void;
          prompt(): void;
          renderButton(element: HTMLElement, options: { theme: string; size: string; text?: string; type?: 'standard' | 'icon'; click_listener?: () => void }): void;
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
    // FedCM uses Chrome's native account chooser API — no popup required.
    // Falls back to a redirect-style flow on browsers that don't support FedCM.
    use_fedcm_for_prompt: true,
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
