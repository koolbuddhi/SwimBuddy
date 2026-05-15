import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ConfirmDialog } from '../../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render its body when open is false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete drill?"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.queryByText('Delete drill?')).toBeNull();
  });

  it('renders title + message when open and exposes Cancel + OK buttons', () => {
    render(
      <ConfirmDialog
        open
        title="Delete drill?"
        message="This drill will be removed."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Delete drill?')).toBeTruthy();
    expect(screen.getByText('This drill will be removed.')).toBeTruthy();
    expect(screen.getByTestId('confirm-cancel-btn')).toBeTruthy();
    expect(screen.getByTestId('confirm-ok-btn')).toBeTruthy();
  });

  it('calls onConfirm when the destructive button is pressed', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog open title="t" onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId('confirm-ok-btn'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="t" onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.press(screen.getByTestId('confirm-cancel-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is pressed', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="t" onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.press(screen.getByTestId('confirm-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom labels when provided', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Remove')).toBeTruthy();
    expect(screen.getByText('Keep')).toBeTruthy();
  });
});
