/**
 * Unit tests for lib/export/share.ts.
 * expo-sharing and expo-file-system are mocked.
 */
import { Platform } from 'react-native';

jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

const { shareAsync: mockShareAsync } = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
const { writeAsStringAsync: mockWrite } = jest.requireMock('expo-file-system/legacy') as { writeAsStringAsync: jest.Mock };

import { shareCSV } from '../../lib/export/share';

beforeEach(() => {
  jest.clearAllMocks();
  mockShareAsync.mockResolvedValue(undefined);
  mockWrite.mockResolvedValue(undefined);
});

describe('shareCSV', () => {
  it('calls expo-sharing on native (ios)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await shareCSV('date,stroke\n2026-05-13,Fly', 'session.csv');
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it('writes file before sharing', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await shareCSV('data', 'out.csv');
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('out.csv'),
      'data',
      expect.objectContaining({ encoding: 'base64' }),
    );
    jest.restoreAllMocks();
  });
});
