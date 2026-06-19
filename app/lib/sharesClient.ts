import type { Share, SharePermission, SharesSnapshot } from './types';

export class SharesClient {
  constructor(private readonly apiBase: string) {}

  async list(): Promise<SharesSnapshot> {
    const res = await fetch(`${this.apiBase}/shares`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.status === 401) throw new ShareError('unauthenticated', 'Sign in required');
    if (!res.ok) throw new ShareError('http', `Network error (${res.status})`);
    return (await res.json()) as SharesSnapshot;
  }

  async invite(email: string, permission: SharePermission): Promise<Share> {
    const res = await fetch(`${this.apiBase}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, permission }),
    });
    if (res.status === 404) throw new ShareError('not_found', 'No user with that email');
    if (res.status === 409) throw new ShareError('already_exists', 'Share already exists');
    if (res.status === 400) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new ShareError('bad_request', body.error ?? 'Invalid request');
    }
    if (!res.ok) throw new ShareError('http', `HTTP ${res.status}`);
    return (await res.json()) as Share;
  }

  async accept(id: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/shares/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new ShareError('http', `HTTP ${res.status}`);
  }

  async decline(id: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/shares/${id}/decline`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new ShareError('http', `HTTP ${res.status}`);
  }

  async revoke(id: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/shares/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new ShareError('http', `HTTP ${res.status}`);
  }
}

export type ShareErrorCode = 'not_found' | 'already_exists' | 'bad_request' | 'unauthenticated' | 'http';

export class ShareError extends Error {
  constructor(public readonly code: ShareErrorCode, message: string) {
    super(message);
    this.name = 'ShareError';
  }
}
