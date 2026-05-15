import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatTimeInput, digToCs, csToDig } from '../lib/time';
import type { Drill, StrokeId } from '../lib/types';

// ── constants ─────────────────────────────────────────────────────────────────

const STROKES: { id: StrokeId; name: string; short: string; color: string }[] = [
  { id: 'fly',    name: 'Butterfly',    short: 'Fly',   color: '#f59e0b' },
  { id: 'back',   name: 'Backstroke',   short: 'Back',  color: '#10b981' },
  { id: 'breast', name: 'Breaststroke', short: 'Breast', color: '#8b5cf6' },
  { id: 'free',   name: 'Freestyle',    short: 'Free',  color: '#3b82f6' },
  { id: 'mixed',  name: 'Mixed',        short: 'Mix',   color: '#64748b' },
];

const PRESET_DISTANCES = [5, 15, 25, 50];

// ── helpers ───────────────────────────────────────────────────────────────────

// ── component ─────────────────────────────────────────────────────────────────

interface DrillSheetProps {
  drill?: Drill;
  onClose: () => void;
  onSave: (patch: Omit<Drill, 'id' | 'createdAt'>) => void;
}

export function DrillSheet({ drill, onClose, onSave }: DrillSheetProps) {
  const isEdit = Boolean(drill);

  const [strokeId, setStrokeId] = useState<StrokeId>(drill?.strokeId ?? 'free');
  const [distance, setDistance] = useState<number>(
    PRESET_DISTANCES.includes(drill?.distance ?? 25) ? (drill?.distance ?? 25) : 25,
  );
  const [useCustom, setUseCustom] = useState(
    Boolean(drill && !PRESET_DISTANCES.includes(drill.distance)),
  );
  const [customDist, setCustomDist] = useState(
    drill && !PRESET_DISTANCES.includes(drill.distance) ? String(drill.distance) : '',
  );
  const [timeDigits, setTimeDigits] = useState<string>(
    drill ? csToDig(drill.timeCs) : '',
  );
  const [label, setLabel] = useState(drill?.label ?? '');

  const inputRef = useRef<TextInput>(null);

  const displayTime = formatTimeInput(timeDigits || '0');
  const timeCs = digToCs(timeDigits || '0');
  const finalDist = useCustom ? parseInt(customDist || '0', 10) : distance;
  const canSave = timeCs > 0 && finalDist > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ strokeId, distance: finalDist, timeCs, label: label.trim() });
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {/* backdrop */}
      <Pressable
        testID="drill-sheet-backdrop"
        style={styles.backdrop}
        onPress={onClose}
      />

      {/* sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* header */}
        <View style={styles.row}>
          <Text style={styles.title}>{isEdit ? 'Edit drill' : 'New drill'}</Text>
          <Pressable
            testID="drill-close-btn"
            onPress={onClose}
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* stroke */}
          <Text style={styles.label}>Stroke</Text>
          <View style={styles.pillRow}>
            {STROKES.map((s) => (
              <Pressable
                key={s.id}
                testID={`stroke-pill-${s.id}`}
                onPress={() => setStrokeId(s.id)}
                style={[
                  styles.pill,
                  strokeId === s.id && { backgroundColor: s.color, borderColor: s.color },
                ]}
                accessibilityLabel={s.name}
                accessibilityState={{ selected: strokeId === s.id }}
              >
                <Text style={[styles.pillText, strokeId === s.id && styles.pillTextActive]}>
                  {s.short}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* distance */}
          <Text style={styles.label}>Distance</Text>
          <View style={styles.pillRow}>
            {PRESET_DISTANCES.map((d) => (
              <Pressable
                key={d}
                testID={`dist-chip-${d}`}
                onPress={() => { setUseCustom(false); setDistance(d); }}
                style={[styles.chip, !useCustom && distance === d && styles.chipActive]}
                accessibilityState={{ selected: !useCustom && distance === d }}
              >
                <Text style={[styles.chipText, !useCustom && distance === d && styles.chipTextActive]}>
                  {d}M
                </Text>
              </Pressable>
            ))}
            <Pressable
              testID="dist-chip-custom"
              onPress={() => setUseCustom(true)}
              style={[styles.chip, useCustom && styles.chipActive]}
              accessibilityState={{ selected: useCustom }}
            >
              <Text style={[styles.chipText, useCustom && styles.chipTextActive]}>Custom</Text>
            </Pressable>
          </View>
          {useCustom && (
            <TextInput
              testID="dist-custom-input"
              style={styles.textInput}
              placeholder="meters"
              keyboardType="numeric"
              value={customDist}
              onChangeText={setCustomDist}
            />
          )}

          {/* time */}
          <Text style={[styles.label, { marginTop: 18 }]}>Time</Text>
          <View style={styles.timeBox}>
            <Pressable
              testID="time-display"
              style={styles.timeTap}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={[styles.timeText, !timeDigits && styles.timePlaceholder]}>
                {displayTime}
              </Text>
              <Text style={styles.timeHint}>MM : SS . HUNDREDTHS</Text>
            </Pressable>
            {timeDigits.length > 0 && (
              <Pressable
                testID="time-clear-btn"
                onPress={() => {
                  setTimeDigits('');
                  inputRef.current?.focus();
                }}
                accessibilityLabel="Clear time"
                style={styles.timeClear}
                hitSlop={8}
              >
                <Text style={styles.timeClearIcon}>✕</Text>
              </Pressable>
            )}
          </View>
          {/* hidden input — onChangeText handles all digit accumulation/deletion;
              we deliberately do NOT use onKeyPress because both handlers can race
              on React Native Web and double-append the new character. */}
          <TextInput
            ref={inputRef}
            testID="time-hidden-input"
            style={styles.hidden}
            value={timeDigits}
            onChangeText={(v) => setTimeDigits(v.replace(/\D/g, '').slice(-6))}
            keyboardType="numeric"
            inputMode="numeric"
          />
          <Text style={styles.hint}>Type digits — e.g. 3045 → 00:30.45</Text>

          {/* label */}
          <Text style={[styles.label, { marginTop: 18 }]}>Label (optional)</Text>
          <TextInput
            testID="drill-label-input"
            style={styles.textInput}
            placeholder="e.g. first try, sprint"
            value={label}
            onChangeText={setLabel}
          />

          {/* save */}
          <Pressable
            testID="drill-save-btn"
            onPress={handleSave}
            disabled={!canSave}
            accessibilityLabel={isEdit ? 'Save changes' : 'Add drill'}
            accessibilityState={{ disabled: !canSave }}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>{isEdit ? 'Save changes' : 'Add drill'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#64748b' },
  label: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  pillTextActive: { color: '#fff' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', minWidth: 56, alignItems: 'center' },
  chipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#fff' },
  timeBox: { backgroundColor: '#f1f5f9', borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', position: 'relative' },
  timeTap: { padding: 20, alignItems: 'center' },
  timeClear: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  timeClearIcon: { fontSize: 13, color: '#475569', fontWeight: '700' },
  timeText: { fontSize: 38, fontWeight: '800', color: '#0f172a', fontVariant: ['tabular-nums'] },
  timePlaceholder: { color: '#cbd5e1' },
  timeHint: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '700', letterSpacing: 0.8 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  textInput: { width: '100%', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: '#0f172a', backgroundColor: '#fff', marginTop: 4 },
  saveBtn: { marginTop: 22, backgroundColor: '#0ea5e9', borderRadius: 12, padding: 14, alignItems: 'center', boxShadow: '0px 6px 8px rgba(2, 132, 199, 0.3)' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
