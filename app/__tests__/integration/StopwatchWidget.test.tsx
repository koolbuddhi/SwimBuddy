import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StopwatchWidget } from '../../components/StopwatchWidget';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-06-19T00:00:00Z') });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('StopwatchWidget', () => {
  it('renders in idle state with only the Start button visible', () => {
    render(<StopwatchWidget onUse={jest.fn()} />);
    expect(screen.getByTestId('stopwatch-display')).toHaveTextContent('--:--.--');
    expect(screen.getByTestId('stopwatch-start')).toBeTruthy();
    expect(screen.queryByTestId('stopwatch-stop')).toBeNull();
    expect(screen.queryByTestId('stopwatch-use')).toBeNull();
  });

  it('after Start, shows Stop and Reset (no Use)', () => {
    render(<StopwatchWidget onUse={jest.fn()} />);
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-start'));
    });
    expect(screen.getByTestId('stopwatch-stop')).toBeTruthy();
    expect(screen.getByTestId('stopwatch-reset')).toBeTruthy();
    expect(screen.queryByTestId('stopwatch-start')).toBeNull();
    expect(screen.queryByTestId('stopwatch-use')).toBeNull();
  });

  it('after Stop, shows Use, Resume, and Reset', () => {
    render(<StopwatchWidget onUse={jest.fn()} />);
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-start'));
    });
    act(() => {
      jest.advanceTimersByTime(1230);
    });
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-stop'));
    });
    expect(screen.getByTestId('stopwatch-use')).toBeTruthy();
    expect(screen.getByTestId('stopwatch-resume')).toBeTruthy();
    expect(screen.getByTestId('stopwatch-reset')).toBeTruthy();
    expect(screen.queryByTestId('stopwatch-stop')).toBeNull();
  });

  it('Use calls onUse with the elapsed cs and resets to idle', () => {
    const onUse = jest.fn();
    render(<StopwatchWidget onUse={onUse} />);
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-start'));
    });
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-stop'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-use'));
    });
    expect(onUse).toHaveBeenCalledTimes(1);
    const [calledWith] = onUse.mock.calls[0];
    expect(calledWith).toBeGreaterThanOrEqual(149);
    expect(calledWith).toBeLessThanOrEqual(151);
    // back to idle — start button visible again
    expect(screen.getByTestId('stopwatch-start')).toBeTruthy();
    expect(screen.getByTestId('stopwatch-display')).toHaveTextContent('--:--.--');
  });

  it('Reset from stopped clears elapsed back to zero without calling onUse', () => {
    const onUse = jest.fn();
    render(<StopwatchWidget onUse={onUse} />);
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-start'));
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-stop'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('stopwatch-reset'));
    });
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByTestId('stopwatch-display')).toHaveTextContent('--:--.--');
    expect(screen.getByTestId('stopwatch-start')).toBeTruthy();
  });
});
