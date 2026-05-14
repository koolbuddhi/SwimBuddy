import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { GroupContainer } from '../../components/GroupContainer';
import type { Drill, Group } from '../../lib/types';

const drills: Drill[] = [
  { id: 'd1', strokeId: 'fly',  distance: 25, timeCs: 1845, label: '', createdAt: '' },
  { id: 'd2', strokeId: 'back', distance: 50, timeCs: 3600, label: '', createdAt: '' },
];

const group: Group = { id: 'g1', name: 'IM Attempt 1', drillIds: ['d1', 'd2'], createdAt: '' };

const defaultProps = {
  group,
  drills,
  onUngroup: jest.fn(),
  onRemoveGroup: jest.fn(),
  onEditDrill: jest.fn(),
  onDeleteDrill: jest.fn(),
};

describe('GroupContainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders group name', () => {
    render(<GroupContainer {...defaultProps} />);
    expect(screen.getByText('IM Attempt 1')).toBeTruthy();
  });

  it('renders total time of grouped drills (1845+3600=5445cs → 00:54.45)', () => {
    render(<GroupContainer {...defaultProps} />);
    expect(screen.getByText('00:54.45')).toBeTruthy();
  });

  it('is expanded by default and shows drill rows', () => {
    render(<GroupContainer {...defaultProps} />);
    // DrillRow renders testID drill-row-main for each drill
    expect(screen.getAllByTestId('drill-row-main').length).toBe(2);
  });

  it('collapses when header is pressed and hides drill rows', () => {
    render(<GroupContainer {...defaultProps} />);
    fireEvent.press(screen.getByTestId('group-header'));
    expect(screen.queryAllByTestId('drill-row-main').length).toBe(0);
  });

  it('expands again after a second header press', () => {
    render(<GroupContainer {...defaultProps} />);
    fireEvent.press(screen.getByTestId('group-header'));
    fireEvent.press(screen.getByTestId('group-header'));
    expect(screen.getAllByTestId('drill-row-main').length).toBe(2);
  });

  it('calls onUngroup when ungroup button is pressed', () => {
    render(<GroupContainer {...defaultProps} />);
    fireEvent.press(screen.getByTestId('group-ungroup-btn'));
    expect(defaultProps.onUngroup).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveGroup when remove button is pressed', () => {
    render(<GroupContainer {...defaultProps} />);
    fireEvent.press(screen.getByTestId('group-remove-btn'));
    expect(defaultProps.onRemoveGroup).toHaveBeenCalledTimes(1);
  });

  it('calls onEditDrill with correct drill when edit button pressed', () => {
    const onEditDrill = jest.fn();
    render(<GroupContainer {...defaultProps} onEditDrill={onEditDrill} />);
    const editBtns = screen.getAllByTestId('drill-edit-btn');
    fireEvent.press(editBtns[0]);
    expect(onEditDrill).toHaveBeenCalledWith(drills[0]);
  });

  it('calls onDeleteDrill with correct drillId when delete button pressed', () => {
    const onDeleteDrill = jest.fn();
    render(<GroupContainer {...defaultProps} onDeleteDrill={onDeleteDrill} />);
    const deleteBtns = screen.getAllByTestId('drill-delete-btn');
    fireEvent.press(deleteBtns[1]);
    expect(onDeleteDrill).toHaveBeenCalledWith('d2');
  });
});
