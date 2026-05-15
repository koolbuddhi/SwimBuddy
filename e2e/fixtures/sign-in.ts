import type { BrowserContext, Page, TestInfo } from '@playwright/test';

const DEFAULT_API_BASE = process.env.API_BASE ?? 'http://localhost:8787';

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Build a unique user per Playwright test. Two contexts inside the same
 * test (e.g. cross-device sync) get the same user; different tests get
 * different users, so server-side state from a prior test can't leak.
 * Pass an optional `suffix` to vary the user inside a single test.
 */
export function userFor(testInfo: TestInfo, suffix = ''): TestUser {
  const slug = testInfo.testId.replace(/[^a-z0-9]/gi, '').slice(0, 16);
  const id = `e2e-${slug}${suffix ? `-${suffix}` : ''}`;
  return { id, email: `${id}@swimbuddy.test`, name: `E2E ${slug}` };
}

/**
 * Hit the Worker's /auth/test-signin backdoor to set the sb_session cookie
 * on this context, then seed the local IndexedDB so the AuthGate sees the
 * user immediately without round-tripping through Google. Without seeding
 * IndexedDB the AuthGate would redirect to /auth — even though the cookie
 * is set, the client doesn't know about the user until signIn() runs.
 */
export async function signInTestUser(
  context: BrowserContext,
  page: Page,
  user: TestUser = { id: 'e2e-user-1', email: 'e2e@swimbuddy.test', name: 'E2E User' },
  apiBase: string = DEFAULT_API_BASE,
): Promise<void> {
  // 1. Set the server-side cookie via the backdoor. Using the context's
  //    fetch automatically attaches the resulting Set-Cookie to subsequent
  //    page navigations.
  const res = await context.request.post(`${apiBase}/auth/test-signin`, {
    data: user,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) {
    throw new Error(
      `test-signin failed: ${res.status()} ${await res.text()}\n` +
      `Make sure the Worker is running with ALLOW_TEST_SIGNIN=true.`,
    );
  }

  // 2. Seed IndexedDB so the AuthGate sees the user on next load. We go
  //    to /auth first — it's a terminal route for unauthenticated users
  //    (no redirect happens), which gives us a stable execution context
  //    for the evaluate() call. Without this, the AuthGate redirects '/'
  //    → '/auth' mid-evaluate and tears down the context.
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async (u) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('SwimBuddyDB');
      req.onsuccess = () => {
        const db = req.result;
        // The Dexie schema only creates the 'meta' store on first use,
        // but our app always opens it; if it's missing we have to bump
        // the version. Easier: rely on the fact that Dexie has already
        // created the store during the page's earlier mount.
        if (!db.objectStoreNames.contains('meta')) {
          db.close();
          // Re-open with a higher version to create the store.
          const upgrade = indexedDB.open('SwimBuddyDB', db.version + 1);
          upgrade.onupgradeneeded = () => {
            upgrade.result.createObjectStore('meta', { keyPath: 'key' });
          };
          upgrade.onsuccess = () => {
            const db2 = upgrade.result;
            const tx2 = db2.transaction('meta', 'readwrite');
            tx2.objectStore('meta').put({
              key: 'singleton',
              userId: u.id,
              userEmail: u.email,
              userName: u.name,
              lastSyncedAt: null,
            });
            tx2.oncomplete = () => { db2.close(); resolve(); };
            tx2.onerror = () => { db2.close(); reject(tx2.error); };
          };
          upgrade.onerror = () => reject(upgrade.error);
          return;
        }
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({
          key: 'singleton',
          userId: u.id,
          userEmail: u.email,
          userName: u.name,
          lastSyncedAt: null,
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, user);

  // 3. Go to '/'. AuthGate reads the seeded meta and the user lands on
  //    the home tab without a redirect to /auth.
  await page.goto('/');
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 10_000 });
}

/**
 * Wipe IndexedDB on the current origin. Useful between tests that need a
 * clean local DB (no leftover sessions / mutations / meta). Goes to /auth
 * first so we're on a stable route (AuthGate doesn't redirect us mid-flight).
 */
export async function clearLocalDB(page: Page): Promise<void> {
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('SwimBuddyDB');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  }));
}
