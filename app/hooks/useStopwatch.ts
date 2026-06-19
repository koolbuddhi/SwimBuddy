import { useEffect, useRef, useState } from 'react';

export type StopwatchStatus = 'idle' | 'running' | 'stopped';

export interface UseStopwatchReturn {
  status: StopwatchStatus;
  elapsedCs: number;
  start: () => void;
  stop: () => void;
  resume: () => void;
  reset: () => void;
}

const TICK_MS = 50;

export function useStopwatch(): UseStopwatchReturn {
  const [status, setStatus] = useState<StopwatchStatus>('idle');
  const [elapsedCs, setElapsedCs] = useState(0);

  // Elapsed is derived from Date.now() — not from counting ticks — so it
  // stays accurate when the tab is backgrounded or the interval is throttled.
  const runStartRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);

  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      const baseline = runStartRef.current;
      if (baseline === null) return;
      const totalMs = accumulatedMsRef.current + (Date.now() - baseline);
      setElapsedCs(Math.floor(totalMs / 10));
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    if (status !== 'idle') return;
    runStartRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedCs(0);
    setStatus('running');
  };

  const stop = () => {
    if (status !== 'running') return;
    const baseline = runStartRef.current;
    if (baseline !== null) {
      accumulatedMsRef.current += Date.now() - baseline;
      runStartRef.current = null;
      setElapsedCs(Math.floor(accumulatedMsRef.current / 10));
    }
    setStatus('stopped');
  };

  const resume = () => {
    if (status !== 'stopped') return;
    runStartRef.current = Date.now();
    setStatus('running');
  };

  const reset = () => {
    runStartRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedCs(0);
    setStatus('idle');
  };

  return { status, elapsedCs, start, stop, resume, reset };
}
