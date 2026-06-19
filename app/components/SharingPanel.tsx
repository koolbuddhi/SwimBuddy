import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShares } from '../lib/SharesContext';
import type { Share, SharePermission } from '../lib/types';

export function SharingPanel() {
  const { outgoing, incoming, loading, error, refresh, invite, accept, decline, revoke } = useShares();
  const [inviteOpen, setInviteOpen] = useState(false);

  const pendingIncoming = incoming.filter((s) => s.status === 'pending');
  const activeIncoming = incoming.filter((s) => s.status === 'accepted');
  const activeOutgoing = outgoing.filter((s) => s.status === 'pending' || s.status === 'accepted');

  return (
    <View style={styles.section} testID="sharing-panel">
      <Text style={styles.sectionTitle}>Sharing</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Incoming — pending invites first */}
      {pendingIncoming.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Invitations</Text>
          {pendingIncoming.map((s) => (
            <ShareRow
              key={s.id}
              testIDPrefix="share-incoming-pending"
              share={s}
              who={s.ownerName ?? s.ownerEmail ?? 'Unknown'}
              subline={`wants to share their log (${s.permission})`}
              actions={[
                { label: 'Accept', testId: 'share-accept', onPress: () => accept(s.id), primary: true },
                { label: 'Decline', testId: 'share-decline', onPress: () => decline(s.id) },
              ]}
            />
          ))}
        </View>
      )}

      {/* Incoming — accepted */}
      {activeIncoming.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Shared with me</Text>
          {activeIncoming.map((s) => (
            <ShareRow
              key={s.id}
              testIDPrefix="share-incoming-active"
              share={s}
              who={s.ownerName ?? s.ownerEmail ?? 'Unknown'}
              subline={s.permission === 'write' ? 'Can view + edit' : 'Can view'}
              actions={[
                { label: 'Leave', testId: 'share-leave', onPress: () => revoke(s.id) },
              ]}
            />
          ))}
        </View>
      )}

      {/* Outgoing */}
      <View style={styles.group}>
        <View style={styles.groupHeaderRow}>
          <Text style={styles.groupTitle}>I&apos;ve shared with</Text>
          <Pressable
            testID="share-invite-btn"
            onPress={() => setInviteOpen(true)}
            style={styles.addBtn}
            accessibilityLabel="Share with someone"
          >
            <Text style={styles.addBtnText}>+ Share</Text>
          </Pressable>
        </View>

        {activeOutgoing.length === 0 ? (
          <Text style={styles.empty}>You haven&apos;t shared with anyone yet.</Text>
        ) : (
          activeOutgoing.map((s) => (
            <ShareRow
              key={s.id}
              testIDPrefix="share-outgoing"
              share={s}
              who={s.recipientName ?? s.recipientEmail ?? 'Unknown'}
              subline={`${s.permission === 'write' ? 'Can edit' : 'View only'} · ${s.status}`}
              actions={[
                { label: 'Revoke', testId: 'share-revoke', onPress: () => revoke(s.id) },
              ]}
            />
          ))
        )}
      </View>

      <Pressable
        testID="share-refresh-btn"
        onPress={refresh}
        disabled={loading}
        style={[styles.btn, loading && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>{loading ? 'Loading…' : 'Refresh'}</Text>
      </Pressable>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={invite}
      />
    </View>
  );
}

// ── share row ─────────────────────────────────────────────────────────────────
interface Action { label: string; testId: string; onPress: () => void; primary?: boolean }

function ShareRow({ share, who, subline, actions, testIDPrefix }: {
  share: Share;
  who: string;
  subline: string;
  actions: Action[];
  testIDPrefix: string;
}) {
  return (
    <View style={styles.shareRow} testID={`${testIDPrefix}-row-${share.id}`}>
      <View style={{ flex: 1 }}>
        <Text style={styles.shareWho}>{who}</Text>
        <Text style={styles.shareSub}>{subline}</Text>
      </View>
      <View style={styles.shareActions}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            testID={`${a.testId}-${share.id}`}
            onPress={a.onPress}
            style={[styles.actionBtn, a.primary && styles.actionPrimary]}
          >
            <Text style={[styles.actionText, a.primary && styles.actionPrimaryText]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── invite dialog ─────────────────────────────────────────────────────────────
function InviteDialog({ open, onClose, onInvite }: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, permission: SharePermission) => Promise<unknown>;
}) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('write');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setPermission('write');
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    const cleaned = email.trim();
    if (!cleaned) {
      setError('Enter an email');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onInvite(cleaned, permission);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={() => { reset(); onClose(); }}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard} testID="share-invite-dialog">
          <Text style={styles.modalTitle}>Share with someone</Text>
          <Text style={styles.modalHint}>
            They must already have a SwimBuddy account. They&apos;ll receive an invitation that they need to accept.
          </Text>
          <TextInput
            testID="share-invite-email"
            style={styles.input}
            placeholder="Email address"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.permRow}>
            <PermPill
              active={permission === 'read'}
              label="View only"
              testID="share-perm-read"
              onPress={() => setPermission('read')}
            />
            <PermPill
              active={permission === 'write'}
              label="Can edit"
              testID="share-perm-write"
              onPress={() => setPermission('write')}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.modalActions}>
            <Pressable
              testID="share-invite-cancel"
              onPress={() => { reset(); onClose(); }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="share-invite-submit"
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.actionBtn, styles.actionPrimary, submitting && styles.btnDisabled]}
            >
              <Text style={styles.actionPrimaryText}>{submitting ? 'Sending…' : 'Send invite'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PermPill({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.permPill, active && styles.permPillActive]}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.permPillText, active && styles.permPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  shareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#f8fafc', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  shareWho: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  shareSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  shareActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#cbd5e1',
  },
  actionPrimary: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  actionPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#0ea5e9', borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  error: { color: '#dc2626', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 380, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalHint: { fontSize: 13, color: '#64748b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a' },
  permRow: { flexDirection: 'row', gap: 8 },
  permPill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#fff' },
  permPillActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  permPillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  permPillTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
