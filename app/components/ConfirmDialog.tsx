import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog. Works identically on web and native — unlike
 * React Native Web's Alert.alert, which silently drops button callbacks.
 *
 * Tap the backdrop or the cancel button to dismiss; the confirm button is
 * styled red when `destructive` is true and labeled "Delete" by default.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onCancel}>
      <Pressable testID="confirm-backdrop" style={styles.backdrop} onPress={onCancel} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
        <View style={styles.row}>
          <Pressable testID="confirm-cancel-btn" onPress={onCancel} style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}>
            <Text style={styles.btnCancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            testID="confirm-ok-btn"
            onPress={onConfirm}
            style={({ pressed }) => [styles.btn, destructive ? styles.btnDestructive : styles.btnPrimary, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  card: {
    position: 'absolute', top: '35%', left: 24, right: 24,
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    boxShadow: '0px 12px 24px rgba(0,0,0,0.2)',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  message: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  btn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  btnPrimary: { backgroundColor: '#0ea5e9' },
  btnDestructive: { backgroundColor: '#dc2626' },
  btnConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnPressed: { opacity: 0.85 },
});
