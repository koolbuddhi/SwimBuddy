import { test, expect } from '@playwright/test';

/**
 * Production smoke tests. No test-signin backdoor — we just verify the
 * static deploy and the public Worker endpoints are alive and serving
 * the expected things.
 */
test.describe('@smoke production', () => {
  test('Pages serves the app shell with the manifest linked', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    const manifestLink = await page.locator('link[rel=manifest]').getAttribute('href');
    expect(manifestLink).toMatch(/manifest\.json/);
  });

  test('Pages serves /manifest.json with PWA fields', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/manifest.json`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('SwimBuddy');
    expect(json.display).toBe('standalone');
    expect(json.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512' }),
    ]));
  });

  test('Worker /health responds 200 with CORS credentials header', async ({ request }) => {
    const apiBase = process.env.API_BASE ?? 'https://swimbuddy-api.buddhima.workers.dev';
    const res = await request.get(`${apiBase}/health`, {
      headers: { Origin: 'https://swimbuddy.pages.dev' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['access-control-allow-credentials']).toBe('true');
  });

  test('Worker /sync rejects unauthenticated calls with 401', async ({ request }) => {
    const apiBase = process.env.API_BASE ?? 'https://swimbuddy-api.buddhima.workers.dev';
    const res = await request.get(`${apiBase}/sync`, {
      headers: { Origin: 'https://swimbuddy.pages.dev' },
    });
    expect(res.status()).toBe(401);
  });

  test('Worker /auth/test-signin returns 404 in production (backdoor is gated)', async ({ request }) => {
    const apiBase = process.env.API_BASE ?? 'https://swimbuddy-api.buddhima.workers.dev';
    const res = await request.post(`${apiBase}/auth/test-signin`, {
      headers: { 'Content-Type': 'application/json', Origin: 'https://swimbuddy.pages.dev' },
      data: { id: 'attacker', email: 'a@b' },
    });
    expect(res.status()).toBe(404);
  });
});
