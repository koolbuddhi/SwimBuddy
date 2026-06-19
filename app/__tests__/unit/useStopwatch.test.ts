import { act, renderHook } from '@testing-library/react-native';
import { useStopwatch } from '../../hooks/useStopwatch';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-06-19T00:00:00Z') });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useStopwatch', () => {
  it('starts in idle with zero elapsed', () => {
    const { result } = renderHook(() => useStopwatch());
    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedCs).toBe(0);
  });

  it('start transitions to running and begins ticking', () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    expect(result.current.status).toBe('running');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // 1000ms = 100 cs (within ±1 tick of resolution)
    expect(result.current.elapsedCs).toBeGreaterThanOrEqual(99);
    expect(result.current.elapsedCs).toBeLessThanOrEqual(101);
  });

  it('stop freezes elapsed and transitions to stopped', () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    act(() => result.current.stop());
    const frozen = result.current.elapsedCs;
    expect(result.current.status).toBe('stopped');
    expect(frozen).toBeGreaterThanOrEqual(199);

    // advancing time after stop should NOT change elapsed
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedCs).toBe(frozen);
  });

  it('resume continues from the previously stored elapsed', () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => result.current.stop());
    const afterFirstLeg = result.current.elapsedCs;

    act(() => result.current.resume());
    expect(result.current.status).toBe('running');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // ~100cs of new run on top of the ~100cs already banked
    expect(result.current.elapsedCs).toBeGreaterThanOrEqual(afterFirstLeg + 99);
    expect(result.current.elapsedCs).toBeLessThanOrEqual(afterFirstLeg + 101);
  });

  it('reset clears elapsed and returns to idle from any state', () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedCs).toBe(0);

    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => result.current.stop());
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedCs).toBe(0);
  });

  it('stop and resume are no-ops when called in the wrong state', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => result.current.stop());
    expect(result.current.status).toBe('idle');

    act(() => result.current.resume());
    expect(result.current.status).toBe('idle');

    act(() => result.current.start());
    act(() => result.current.resume());
    expect(result.current.status).toBe('running');

    act(() => result.current.start());
    expect(result.current.status).toBe('running');
  });

  it('stays accurate across tab background — system time advances without ticks', () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());

    // Run for 100ms of foreground time → ~10cs
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Tab backgrounded — system clock advances 5 seconds with no ticks firing
    act(() => {
      jest.setSystemTime(new Date(Date.now() + 5000));
    });

    // First foreground tick (next interval fire). Total elapsed should reflect
    // wall-clock truth: ~5100ms = ~510cs.
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current.elapsedCs).toBeGreaterThanOrEqual(509);
    expect(result.current.elapsedCs).toBeLessThanOrEqual(515);
  });

  it('cleans up the interval on unmount', () => {
    const { result, unmount } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(100);
    });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
