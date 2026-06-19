import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../lib/SessionContext';
import {
  improvementVelocity,
  personalBests,
  strokeBalance,
  trendByEvent,
  volumeSummary,
} from '../lib/analytics';
import { csToTime } from '../lib/time';
import type { StrokeId } from '../lib/types';

const STROKE_NAMES: Record<StrokeId, string> = {
  fly: 'Butterfly',
  back: 'Backstroke',
  breast: 'Breaststroke',
  free: 'Freestyle',
  mixed: 'Mixed',
};
const STROKE_COLOURS: Record<StrokeId, string> = {
  fly: '#f59e0b',
  back: '#10b981',
  breast: '#8b5cf6',
  free: '#3b82f6',
  mixed: '#64748b',
};

function isoNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}

export function AnalyticsScreen() {
  const { sessions } = useSession();

  const pbs = useMemo(() => personalBests(sessions), [sessions]);
  const last30Balance = useMemo(() => strokeBalance(sessions, isoNDaysAgo(30)), [sessions]);
  const last30Vol = useMemo(() => volumeSummary(sessions, isoNDaysAgo(30)), [sessions]);

  // Pick the first PB by default; let the user switch.
  const [selectedKey, setSelectedKey] = useState<string | null>(
    pbs[0] ? `${pbs[0].strokeId}-${pbs[0].distance}` : null,
  );
  // Re-sync the selection if the PB set changes (e.g. first sync brings data).
  React.useEffect(() => {
    if (!selectedKey && pbs[0]) setSelectedKey(`${pbs[0].strokeId}-${pbs[0].distance}`);
  }, [pbs, selectedKey]);

  const selected = pbs.find((p) => `${p.strokeId}-${p.distance}` === selectedKey);
  const trend = useMemo(
    () => (selected ? trendByEvent(sessions, selected.strokeId, selected.distance) : []),
    [sessions, selected],
  );
  const velocity = useMemo(
    () => (selected ? improvementVelocity(sessions, selected.strokeId, selected.distance) : null),
    [sessions, selected],
  );

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Analytics</Text>
        <Text style={styles.emptyBody}>
          Log a few sessions and PBs first — your trends will show up here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.container}>
      {/* ── volume tile ───────────────────────────────────── */}
      <View style={styles.tile} testID="analytics-volume-tile">
        <Text style={styles.tileLabel}>Last 30 days</Text>
        <View style={styles.tileRow}>
          <TileStat n={last30Vol.sessionCount} label="sessions" />
          <TileStat n={last30Vol.drillCount} label="drills" />
          <TileStat n={(last30Vol.totalDistance / 1000).toFixed(1) + 'km'} label="swum" />
        </View>
      </View>

      {/* ── personal bests ────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Personal bests</Text>
      <View style={styles.card}>
        {pbs.map((pb) => {
          const k = `${pb.strokeId}-${pb.distance}`;
          const active = k === selectedKey;
          return (
            <Pressable
              key={k}
              testID={`pb-row-${k}`}
              onPress={() => setSelectedKey(k)}
              style={[styles.pbRow, active && styles.pbRowActive]}
            >
              <View style={[styles.strokeDot, { backgroundColor: STROKE_COLOURS[pb.strokeId] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pbEvent}>
                  {pb.distance}M {STROKE_NAMES[pb.strokeId]}
                </Text>
                <Text style={styles.pbDate}>Set on {pb.date}</Text>
              </View>
              <Text style={styles.pbTime}>{csToTime(pb.timeCs)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── trend (selected event) ────────────────────────── */}
      {selected && (
        <>
          <Text style={styles.sectionTitle}>
            Trend · {selected.distance}M {STROKE_NAMES[selected.strokeId]}
          </Text>
          <View style={styles.card} testID="analytics-trend">
            <TrendBars points={trend} colour={STROKE_COLOURS[selected.strokeId]} />
            {trend.length > 0 ? (
              <View style={styles.trendStats}>
                <View style={styles.trendStat}>
                  <Text style={styles.trendStatLabel}>Best</Text>
                  <Text style={styles.trendStatValue}>
                    {csToTime(Math.min(...trend.map((p) => p.timeCs)))}
                  </Text>
                </View>
                <View style={styles.trendStat}>
                  <Text style={styles.trendStatLabel}>Latest</Text>
                  <Text style={styles.trendStatValue}>
                    {csToTime(trend[trend.length - 1].timeCs)}
                  </Text>
                </View>
                <View style={styles.trendStat}>
                  <Text style={styles.trendStatLabel}>Swims</Text>
                  <Text style={styles.trendStatValue}>{trend.length}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.trendEmpty}>Not enough swims of this event yet.</Text>
            )}
          </View>
        </>
      )}

      {/* ── velocity card ─────────────────────────────────── */}
      {selected && (
        <>
          <Text style={styles.sectionTitle}>Improvement velocity · last 8 weeks</Text>
          <View style={styles.card} testID="analytics-velocity">
            {velocity === null ? (
              <Text style={styles.velocityEmpty}>
                Need at least two practices of this event in the last 8 weeks.
              </Text>
            ) : (
              <View>
                <Text
                  style={[
                    styles.velocityHero,
                    { color: velocity.secondsPerWeek <= 0 ? '#10b981' : '#dc2626' },
                  ]}
                >
                  {velocity.secondsPerWeek <= 0 ? '▼' : '▲'}{' '}
                  {Math.abs(velocity.secondsPerWeek).toFixed(2)}s / week
                </Text>
                <Text style={styles.velocitySub}>
                  {velocity.secondsPerWeek <= 0
                    ? 'Getting faster — keep going.'
                    : 'Slower trend — could be fatigue, growth spurt, or just noise.'}
                </Text>
                <Text style={styles.velocityFootnote}>
                  Based on {velocity.samples} practice{velocity.samples === 1 ? '' : 's'} of this event.
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ── stroke balance ────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Stroke balance · last 30 days</Text>
      <View style={styles.card} testID="analytics-stroke-balance">
        {last30Balance.every((b) => b.percentage === 0) ? (
          <Text style={styles.balanceEmpty}>No drills logged in the last 30 days.</Text>
        ) : (
          last30Balance.map((b) => (
            <View key={b.strokeId} style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>{STROKE_NAMES[b.strokeId]}</Text>
              <View style={styles.balanceBar}>
                <View
                  style={[
                    styles.balanceBarFill,
                    { width: `${b.percentage}%`, backgroundColor: STROKE_COLOURS[b.strokeId] },
                  ]}
                />
              </View>
              <Text style={styles.balancePct}>{b.percentage.toFixed(0)}%</Text>
            </View>
          ))
        )}
        <Text style={styles.balanceFootnote}>
          Volume-weighted by distance. Coaches usually want roughly even spread
          under age 14, even if a swimmer races one stroke.
        </Text>
      </View>

      <Text style={styles.footnote}>
        Stats derived from your logged sessions. No external data.
      </Text>
    </ScrollView>
  );
}

// ─── trend bars ───────────────────────────────────────────────────────────────
// A poor-man's sparkline using Views — no SVG dep.
function TrendBars({ points, colour }: { points: { date: string; timeCs: number }[]; colour: string }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.timeCs));
  const min = Math.min(...points.map((p) => p.timeCs));
  const range = max - min;
  // Lower time = better; bar height grows as time gets smaller. The smallest
  // time hits ~100% of the chart height; the slowest is at the floor.
  const heightFor = (timeCs: number) => {
    if (range === 0) return 50;
    return 25 + (75 * (max - timeCs)) / range;       // 25..100
  };
  return (
    <View style={styles.barChart}>
      {points.map((p) => (
        <View key={`${p.date}-${p.timeCs}`} style={styles.barCol} testID={`trend-bar-${p.date}`}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={[styles.bar, { height: `${heightFor(p.timeCs)}%`, backgroundColor: colour }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function TileStat({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={styles.tileStat}>
      <Text style={styles.tileStatN}>{n}</Text>
      <Text style={styles.tileStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollOuter: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  container: { padding: 16, paddingBottom: 40, gap: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyBody: { fontSize: 14, color: '#64748b', textAlign: 'center' },

  tile: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14, padding: 14, marginBottom: 18,
    boxShadow: '0px 6px 14px rgba(14, 165, 233, 0.25)',
  },
  tileLabel: {
    fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  tileRow: { flexDirection: 'row', justifyContent: 'space-around' },
  tileStat: { alignItems: 'center' },
  tileStatN: { fontSize: 22, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] },
  tileStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 1 },

  sectionTitle: {
    marginTop: 18, marginBottom: 8,
    fontSize: 11, fontWeight: '800', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  pbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10,
  },
  pbRowActive: { backgroundColor: '#f1f5f9' },
  strokeDot: { width: 12, height: 12, borderRadius: 6 },
  pbEvent: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pbDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pbTime: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontVariant: ['tabular-nums'] },

  barChart: {
    flexDirection: 'row', alignItems: 'stretch',
    height: 120, padding: 8, gap: 2,
  },
  barCol: { flex: 1, alignItems: 'stretch' },
  bar: { width: '80%', borderRadius: 3, minHeight: 6 },
  trendStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: 8, paddingBottom: 6,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  trendStat: { alignItems: 'center' },
  trendStatLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' },
  trendStatValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontVariant: ['tabular-nums'], marginTop: 2 },
  trendEmpty: { padding: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },

  velocityHero: {
    fontSize: 26, fontWeight: '900',
    paddingHorizontal: 12, paddingTop: 12,
    fontVariant: ['tabular-nums'],
  },
  velocitySub: { fontSize: 13, color: '#475569', paddingHorizontal: 12, marginTop: 4 },
  velocityFootnote: { fontSize: 11, color: '#94a3b8', padding: 12, paddingTop: 6 },
  velocityEmpty: { padding: 16, color: '#94a3b8', fontStyle: 'italic' },

  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 8,
  },
  balanceLabel: { fontSize: 12, color: '#475569', fontWeight: '700', width: 80 },
  balanceBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  balanceBarFill: { height: '100%', borderRadius: 5 },
  balancePct: { fontSize: 12, color: '#64748b', width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  balanceEmpty: { padding: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },
  balanceFootnote: { fontSize: 11, color: '#94a3b8', padding: 8, paddingTop: 4 },

  footnote: { fontSize: 11, color: '#cbd5e1', textAlign: 'center', marginTop: 20 },
});
