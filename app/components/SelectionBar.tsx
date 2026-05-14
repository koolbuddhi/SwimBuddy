import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { csToTime } from '../lib/time';

interface SelectionBarProps {
  selectedCount: number;
  totalCs: number;
  onSaveGroup: (name: string) => void;
  onClearSelection: () => void;
}

export function SelectionBar({ selectedCount, totalCs, onSaveGroup, onClearSelection }: SelectionBarProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const canSave = selectedCount >= 2;
  const canConfirm = name.trim().length > 0;

  const handleConfirm = () => {
    onSaveGroup(name.trim());
    setNaming(false);
    setName('');
  };

  const handleCancel = () => {
    setNaming(false);
    setName('');
  };

  if (naming) {
    return (
      <View style={styles.bar}>
        <TextInput
          testID="group-name-input"
          style={styles.nameInput}
          placeholder="Group name…"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={canConfirm ? handleConfirm : undefined}
        />
        <Pressable
          testID="group-name-confirm-btn"
          style={[styles.btn, styles.confirmBtn, !canConfirm && styles.btnDisabled]}
          onPress={canConfirm ? handleConfirm : undefined}
          accessibilityState={{ disabled: !canConfirm }}
        >
          <Text style={styles.confirmText}>Save</Text>
        </Pressable>
        <Pressable testID="group-name-cancel-btn" style={styles.btn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <Text style={styles.count}>{selectedCount} selected</Text>
      <Text style={styles.total}>{csToTime(totalCs)}</Text>

      <Pressable
        testID="selection-save-btn"
        style={[styles.btn, styles.saveBtn, !canSave && styles.btnDisabled]}
        onPress={canSave ? () => setNaming(true) : undefined}
        accessibilityState={{ disabled: !canSave }}
      >
        <Text style={styles.saveText}>Group</Text>
      </Pressable>

      <Pressable testID="selection-clear-btn" style={styles.btn} onPress={onClearSelection}>
        <Text style={styles.clearText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  count: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  total: { fontSize: 14, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveBtn: { backgroundColor: '#0284c7' },
  confirmBtn: { backgroundColor: '#15803d' },
  btnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  clearText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  nameInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#0f172a',
  },
});
