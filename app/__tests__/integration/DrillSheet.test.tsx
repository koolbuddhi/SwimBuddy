import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DrillSheet } from '../../components/DrillSheet';
import type { Drill } from '../../lib/types';

const makeDrill = (overrides: Partial<Drill> = {}): Drill => ({
  id: 'd1',
  strokeId: 'fly',
  distance: 25,
  timeCs: 3045,
  label: '',
  createdAt: '2026-05-13T10:00:00.000Z',
  ...overrides,
});

describe('DrillSheet — add mode', () => {
  const onClose = jest.fn();
  const onSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    render(<DrillSheet onClose={onClose} onSave={onSave} />);
  });

  it('renders "New drill" title', () => {
    expect(screen.getByText('New drill')).toBeTruthy();
  });

  it('shows Save button disabled initially (no time entered)', () => {
    const saveBtn = screen.getByTestId('drill-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows time display defaulting to 00:00.00', () => {
    expect(screen.getByTestId('time-display')).toBeTruthy();
    expect(screen.getByText('00:00.00')).toBeTruthy();
  });

  it('stroke pills are rendered for all 5 strokes', () => {
    expect(screen.getByText('Fly')).toBeTruthy();
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByText('Breast')).toBeTruthy();
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByText('Mix')).toBeTruthy();
  });

  it('distance chips 5M 15M 25M 50M and Custom are rendered', () => {
    expect(screen.getByText('5M')).toBeTruthy();
    expect(screen.getByText('15M')).toBeTruthy();
    expect(screen.getByText('25M')).toBeTruthy();
    expect(screen.getByText('50M')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('onClose fires when backdrop is pressed', () => {
    fireEvent.press(screen.getByTestId('drill-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onClose fires when X button is pressed', () => {
    fireEvent.press(screen.getByTestId('drill-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DrillSheet — time input digit accumulation', () => {
  // Simulate progressive typing the way a controlled input naturally accumulates:
  // each onChangeText receives the full accumulated value (just like a real browser).
  const type = (input: ReturnType<typeof screen.getByTestId>, digits: string) => {
    for (let i = 1; i <= digits.length; i++) {
      fireEvent.changeText(input, digits.slice(0, i));
    }
  };

  it('typing "3045" → display 00:30.45 (sub-minute, no duplication)', () => {
    render(<DrillSheet onClose={jest.fn()} onSave={jest.fn()} />);
    const input = screen.getByTestId('time-hidden-input');
    type(input, '3045');
    expect(screen.getByText('00:30.45')).toBeTruthy();
  });

  it('typing "013000" → display 01:30.00 (crosses 1-minute boundary)', () => {
    render(<DrillSheet onClose={jest.fn()} onSave={jest.fn()} />);
    const input = screen.getByTestId('time-hidden-input');
    type(input, '013000');
    expect(screen.getByText('01:30.00')).toBeTruthy();
  });

  it('Save is enabled after entering a positive time with a preset distance', () => {
    render(<DrillSheet onClose={jest.fn()} onSave={jest.fn()} />);
    const input = screen.getByTestId('time-hidden-input');
    type(input, '3045');
    const saveBtn = screen.getByTestId('drill-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('onSave fires with correct timeCs (sub-minute case: 3045cs)', () => {
    const onSave = jest.fn();
    render(<DrillSheet onClose={jest.fn()} onSave={onSave} />);
    const input = screen.getByTestId('time-hidden-input');
    type(input, '3045');
    fireEvent.press(screen.getByTestId('drill-save-btn'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ timeCs: 3045, distance: 25 }),
    );
  });

  it('onSave fires with correct timeCs for times ≥ 1 minute (013000 → 9000cs)', () => {
    // Regression test: old code stored parseInt("013000") = 13000 (2:10.00) instead of 9000 (1:30.00).
    const onSave = jest.fn();
    render(<DrillSheet onClose={jest.fn()} onSave={onSave} />);
    const input = screen.getByTestId('time-hidden-input');
    type(input, '013000');
    fireEvent.press(screen.getByTestId('drill-save-btn'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ timeCs: 9000 }),
    );
  });
});

describe('DrillSheet — edit mode', () => {
  it('renders "Edit drill" title', () => {
    render(
      <DrillSheet drill={makeDrill()} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.getByText('Edit drill')).toBeTruthy();
  });

  it('pre-populates time display from drill.timeCs (sub-minute)', () => {
    render(
      <DrillSheet drill={makeDrill({ timeCs: 3045 })} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.getByText('00:30.45')).toBeTruthy();
  });

  it('pre-populates time display from drill.timeCs (≥ 1 min — regression for csToDig)', () => {
    // Old broken csToDig did String(9000) = "9000" → displayed "00:90.00" instead of "01:30.00".
    render(
      <DrillSheet drill={makeDrill({ timeCs: 9000 })} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.getByText('01:30.00')).toBeTruthy();
  });

  it('Save is enabled immediately in edit mode (drill already has time + distance)', () => {
    render(
      <DrillSheet drill={makeDrill()} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    const saveBtn = screen.getByTestId('drill-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('Save button label says "Save changes" in edit mode', () => {
    render(
      <DrillSheet drill={makeDrill()} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.getByText('Save changes')).toBeTruthy();
  });
});
