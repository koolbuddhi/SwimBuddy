import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStopwatch } from '../hooks/useStopwatch';
import { csToTime } from '../lib/time';

interface Props {
  onUse: (elapsedCs: number) => void;
}

export function StopwatchWidget({ onUse }: Props) {
  const sw = useStopwatch();

  const handleUse = () => {
    onUse(sw.elapsedCs);
    sw.reset();
  };

  return (
    <View testID="stopwatch-widget" style={styles.container}>
      <Text testID="stopwatch-display" style={[styles.display, sw.status === 'idle' && styles.displayIdle]}>
        {sw.status === 'idle' ? '--:--.--' : csToTime(sw.elapsedCs)}
      </Text>
      <View style={styles.buttonRow}>
        {sw.status === 'idle' && (
          <Pressable
            testID="stopwatch-start"
            onPress={sw.start}
            style={[styles.btn, styles.btnPrimary]}
            accessibilityLabel="Start stopwatch"
          >
            <Text style={styles.btnPrimaryText}>▶ Start</Text>
          </Pressable>
        )}

        {sw.status === 'running' && (
          <>
            <Pressable
              testID="stopwatch-stop"
              onPress={sw.stop}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityLabel="Stop stopwatch"
            >
              <Text style={styles.btnPrimaryText}>⏸ Stop</Text>
            </Pressable>
            <Pressable
              testID="stopwatch-reset"
              onPress={sw.reset}
              style={[styles.btn, styles.btnSecondary]}
              accessibilityLabel="Reset stopwatch"
            >
              <Text style={styles.btnSecondaryText}>Reset</Text>
            </Pressable>
          </>
        )}

        {sw.status === 'stopped' && (
          <>
            <Pressable
              testID="stopwatch-use"
              onPress={handleUse}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityLabel="Use stopwatch time"
            >
              <Text style={styles.btnPrimaryText}>✓ Use</Text>
            </Pressable>
            <Pressable
              testID="stopwatch-resume"
              onPress={sw.resume}
              style={[styles.btn, styles.btnSecondary]}
              accessibilityLabel="Resume stopwatch"
            >
              <Text style={styles.btnSecondaryText}>▶ Resume</Text>
            </Pressable>
            <Pressable
              testID="stopwatch-reset"
              onPress={sw.reset}
              style={[styles.btn, styles.btnSecondary]}
              accessibilityLabel="Reset stopwatch"
            >
              <Text style={styles.btnSecondaryText}>Reset</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  display: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  displayIdle: {
    color: '#cbd5e1',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0ea5e9',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  btnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
