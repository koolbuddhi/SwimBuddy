import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DrillRow } from '../../components/DrillRow';
import type { Drill } from '../../lib/types';

const drill: Drill = {
  id: 'd1',
  strokeId: 'fly',
  distance: 25,
  timeCs: 1845,
  label: 'sprint',
  createdAt: '2026-05-13T10:00:00.000Z',
};

describe('DrillRow', () => {
  it('renders stroke short name and distance', () => {
    render(
      <DrillRow drill={drill} selected={false} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(screen.getByText('Fly')).toBeTruthy();
    expect(screen.getByText(/25M/)).toBeTruthy();
  });

  it('renders formatted time', () => {
    render(
      <DrillRow drill={drill} selected={false} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(screen.getByText('00:18.45')).toBeTruthy();
  });

  it('renders optional label when present', () => {
    render(
      <DrillRow drill={drill} selected={false} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(screen.getByText('sprint')).toBeTruthy();
  });

  it('does not render label when empty', () => {
    render(
      <DrillRow
        drill={{ ...drill, label: '' }}
        selected={false}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('drill-label')).toBeNull();
  });

  it('onToggle fires when row main area is pressed', () => {
    const onToggle = jest.fn();
    render(
      <DrillRow drill={drill} selected={false} onToggle={onToggle} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('drill-row-main'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('onEdit fires when edit button is pressed', () => {
    const onEdit = jest.fn();
    render(
      <DrillRow drill={drill} selected={false} onToggle={jest.fn()} onEdit={onEdit} onDelete={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('drill-edit-btn'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('onDelete fires when delete button is pressed', () => {
    const onDelete = jest.fn();
    render(
      <DrillRow drill={drill} selected={false} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={onDelete} />,
    );
    fireEvent.press(screen.getByTestId('drill-delete-btn'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('selected state is visible (accessibilityState)', () => {
    render(
      <DrillRow drill={drill} selected={true} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    const main = screen.getByTestId('drill-row-main');
    expect(main.props.accessibilityState?.selected).toBe(true);
  });
});
