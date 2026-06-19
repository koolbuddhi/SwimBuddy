# Feature Plan: Share Sessions with Other Users (read+write)

**Status:** Ready for review
**Branch:** `feat/share-and-stopwatch`
**Depends on:** existing auth + sync (live in prod)

---

## Summary

Allow a user (owner) to invite another registered user (recipient) by email
to view and edit their swim sessions. Targeted at parent ↔ parent and
parent ↔ coach pairs. v1 keeps it pairwise; no groups or org accounts.

---

## Locked decisions

| Aspect | Decision |
| --- | --- |
| Granularity | All-my-sessions per share. No per-session/per-group sharing. |
| Permission | `read` or `write`. v1 ships both. |
| Discovery | Recipient identified by email. No directory; if email unknown → API returns 404. |
| Acceptance | Explicit accept flow. Sessions don't appear in recipient's app until accepted. |
| View | Separate "viewing X's log" mode via a swimmer switcher at the top of Home. Owner data and shared data never merge into one list. |
| Ownership | **Immutable**. Editor identity is tracked separately via `last_edited_by_user_id`. |
| Revoke | Either side can end the share at any time. |
| Conflict resolution | Per-drill merge (`lib/sync/conflicts.ts`) wired in. Concurrent edits on the **same** drill remain LWW; concurrent adds on **different** drills both survive. |
| Audit | Inline "edited by X · 2pm" badge on session card. No diff/history. |

---

## Schema changes (D1)

```sql
CREATE TABLE shares (
  id TEXT PRIMARY KEY,                -- ulid
  owner_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  permission TEXT NOT NULL,           -- 'read' | 'write'
  status TEXT NOT NULL,               -- 'pending' | 'accepted' | 'declined' | 'revoked'
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  revoked_at INTEGER,
  UNIQUE (owner_user_id, recipient_user_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);
CREATE INDEX idx_shares_recipient ON shares(recipient_user_id, status);
CREATE INDEX idx_shares_owner ON shares(owner_user_id, status);

ALTER TABLE sessions ADD COLUMN last_edited_by_user_id TEXT;
ALTER TABLE sessions ADD COLUMN last_edited_at INTEGER;
```

> Migration runs via `wrangler d1 migrations apply --remote` — **manual**, not
> CI-driven, per the boundary in `CLAUDE.md`.

---

## API endpoints (Worker)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/shares` | required | body `{ email, permission }` → creates `pending`. 404 if email unknown. 409 if a share already exists between the pair. |
| GET | `/shares` | required | Returns `{ outgoing: [...], incoming: [...] }` involving me. |
| POST | `/shares/:id/accept` | recipient only | transitions `pending` → `accepted` |
| POST | `/shares/:id/decline` | recipient only | transitions `pending` → `declined` |
| DELETE | `/shares/:id` | either side | transitions to `revoked` (or `declined` if pre-accept) |
| GET | `/sync` | required | now returns sessions where I'm owner **OR** accepted recipient. Each session tagged with `ownerId`. |
| POST | `/sync` | required | server verifies each upserted session: `userId === ownerId` OR active write share exists. Otherwise 403 for that session only. Sets `last_edited_by_user_id = userId`. |

---

## Client changes

| Area | Change |
| --- | --- |
| **Local DB** | `sessions` table gets `ownerId` and `lastEditedByUserId` columns. All session queries filter by selected swimmer. Mutation queue ops carry `ownerId`. |
| **SessionContext** | New `selectedOwnerId` state (defaults to current user). Pull merges all visible owners but reads filter on `selectedOwnerId`. |
| **Home screen** | Chip row at top: `[ Me ] [ Kid (via Coach K) ] [ Parent B ]`. Only renders when ≥1 accepted incoming share exists. |
| **Settings → Sharing** | Two lists ("I've shared with", "Shared with me") with status pills and a `+` button → email input modal. |
| **Session card** | Small `edited by X` pill when `lastEditedByUserId !== ownerId`. |
| **Permission guards** | UI disables edit/delete in `read`-only mode; FAB hidden when viewing a read-only share. |

---

## Conflict resolution wiring

`lib/sync/conflicts.ts` is currently dead code. Wire it into the pull path
in `SessionContext.sync()`:

1. For each session returned by `/sync`, if local has the same `id` AND
   local has an unsynced mutation queued for it, run `mergeSession(local, remote)`.
2. Result becomes the new local row; mutation queue keeps the local-side
   delta for the next push.
3. Drift only resolves on full round-trip — fine, sync runs every 30s.

---

## Tasks (S1 → S6)

### Phase S1 · Backend foundations
- [ ] **SH-01** · D1 migration `0007_shares.sql` + `0008_session_attribution.sql`
- [ ] **SH-02** · Drizzle schema additions (`shares`, session columns)
- [ ] **SH-03** · `POST /shares`, `GET /shares` + jest tests (auth-gated, 404 on unknown email, 409 on dup)
- [ ] **SH-04** · `POST /shares/:id/{accept,decline}` + `DELETE /shares/:id` + tests
- [ ] **SH-05** · `/sync` GET extends to shared sessions (tagged with `ownerId`); tests cover owner + recipient views
- [ ] **SH-06** · `/sync` POST validates per-session permission; sets `last_edited_by_user_id`; tests cover 403 path

🔵 **Checkpoint A** — Worker tests pass; share lifecycle end-to-end via curl

### Phase S2 · Local data layer
- [ ] **SH-07** · `localDB` schema bump: `sessions.ownerId`, `sessions.lastEditedByUserId`. Both web (Dexie) + native (sqlite) migrations.
- [ ] **SH-08** · `SessionContext.selectedOwnerId` + filter in all `getSessions()` calls
- [ ] **SH-09** · Mutation queue ops carry `ownerId` for outbound writes

🔵 **Checkpoint B** — Existing single-user flow still passes all 192 app tests

### Phase S3 · Share management UI
- [ ] **SH-10** · `SharesContext` (fetches `/shares`, exposes incoming/outgoing + actions)
- [ ] **SH-11** · `app/(tabs)/settings.tsx` → "Sharing" subscreen with two lists + email-input modal
- [ ] **SH-12** · Accept/decline/revoke flows wired with optimistic UI

### Phase S4 · Swimmer switcher + permission gating
- [ ] **SH-13** · Chip row component on Home (`SwimmerSwitcher`), driven by `SharesContext`
- [ ] **SH-14** · Read-only mode: hide FAB, disable swipe-to-delete, lock DrillSheet to read-only when `selectedOwnerId !== me AND permission === 'read'`
- [ ] **SH-15** · Attribution badge on `SessionCard`

### Phase S5 · Wire per-drill merge
- [ ] **SH-16** · Wire `mergeSession()` from `lib/sync/conflicts.ts` into `SessionContext.sync()` pull path
- [ ] **SH-17** · Unit test: parent adds drill A offline, coach adds drill B offline → after sync both exist
- [ ] **SH-18** · Unit test: same-drill concurrent edit → LWW wins; the loser is logged (not silently dropped)

### Phase S6 · E2E + ship
- [ ] **SH-19** · Playwright: invite → accept → write-share visible session; revoke removes it
- [ ] **SH-20** · Playwright: read-only share cannot edit
- [ ] **SH-21** · Manual prod checklist: migration applied, secret unchanged, CORS unchanged
- [ ] **SH-22** · Update `CLAUDE.md` "Known gotchas" + boundary section if needed

🔵 **Checkpoint C** — All e2e green; ready to deploy

---

## Risks

1. **Data leakage on share-revoke** — if recipient pulled sessions before revoke, their local DB still has them. Mitigation: on next pull post-revoke, server returns a `removed_owner_ids` list; client purges those sessions. Add as **SH-15.5** if we want to plug this gap in v1.
2. **Email enumeration** — `POST /shares` returns 404 for unknown emails, which lets anyone test if an email is registered. Mitigation: return 202 ("invitation queued") either way; only actually create the share if the email matches. Add as **SH-03.5** if privacy matters.
3. **Per-drill merge edge cases** — `lib/sync/conflicts.ts` has zero production miles. Wire it carefully and add a feature flag (`SHARE_MERGE=true`) so we can disable if it misbehaves. Already implicit in the test plan.
