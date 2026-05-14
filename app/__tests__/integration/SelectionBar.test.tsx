import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SelectionBar } from '../../components/SelectionBar';

describe('SelectionBar', () => {
  const defaultProps = {
    selectedCount: 2,
    totalCs: 5445,
    onSaveGroup: jest.fn(),
    onClearSelection: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders selected count', () => {
    render(<SelectionBar {...defaultProps} />);
    expect(screen.getByText(/2 selected/)).toBeTruthy();
  });

  it('renders total time', () => {
    // 5445 cs = 00:54.45
    render(<SelectionBar {...defaultProps} />);
    expect(screen.getByText('00:54.45')).toBeTruthy();
  });

  it('clear button calls onClearSelection', () => {
    const onClearSelection = jest.fn();
    render(<SelectionBar {...defaultProps} onClearSelection={onClearSelection} />);
    fireEvent.press(screen.getByTestId('selection-clear-btn'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('save button is disabled when selectedCount < 2', () => {
    render(<SelectionBar {...defaultProps} selectedCount={1} />);
    const btn = screen.getByTestId('selection-save-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is enabled when selectedCount >= 2', () => {
    render(<SelectionBar {...defaultProps} selectedCount={2} />);
    const btn = screen.getByTestId('selection-save-btn');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('tapping save shows name input', () => {
    render(<SelectionBar {...defaultProps} />);
    fireEvent.press(screen.getByTestId('selection-save-btn'));
    expect(screen.getByTestId('group-name-input')).toBeTruthy();
  });

  it('calls onSaveGroup with trimmed name when confirm pressed', () => {
    const onSaveGroup = jest.fn();
    render(<SelectionBar {...defaultProps} onSaveGroup={onSaveGroup} />);
    fireEvent.press(screen.getByTestId('selection-save-btn'));
    fireEvent.changeText(screen.getByTestId('group-name-input'), '  Sprint Set  ');
    fireEvent.press(screen.getByTestId('group-name-confirm-btn'));
    expect(onSaveGroup).toHaveBeenCalledWith('Sprint Set');
  });

  it('confirm button is disabled when name is empty/whitespace', () => {
    render(<SelectionBar {...defaultProps} />);
    fireEvent.press(screen.getByTestId('selection-save-btn'));
    fireEvent.changeText(screen.getByTestId('group-name-input'), '   ');
    const btn = screen.getByTestId('group-name-confirm-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('cancel name input hides it and returns to bar', () => {
    render(<SelectionBar {...defaultProps} />);
    fireEvent.press(screen.getByTestId('selection-save-btn'));
    fireEvent.press(screen.getByTestId('group-name-cancel-btn'));
    expect(screen.queryByTestId('group-name-input')).toBeNull();
  });
});
