import { describe, it, expect } from 'vitest';
import { FilterEngine } from '../../webview/filters';
import { LogEntry } from '../../templates/types';

function makeEntry(overrides: Partial<LogEntry> & { line: number }): LogEntry {
  return {
    timestamp: '2024-01-01T00:00:00.000Z',
    level: 'Information',
    message: 'Test message',
    properties: {},
    raw: {},
    ...overrides,
  };
}

describe('FilterEngine.apply', () => {
  const entries: LogEntry[] = [
    makeEntry({ line: 0, level: 'Verbose', message: 'verbose msg' }),
    makeEntry({ line: 1, level: 'Debug', message: 'debug msg' }),
    makeEntry({ line: 2, level: 'Information', message: 'info msg' }),
    makeEntry({ line: 3, level: 'Warning', message: 'warning msg' }),
    makeEntry({ line: 4, level: 'Error', message: 'error msg' }),
    makeEntry({ line: 5, level: 'Fatal', message: 'fatal msg' }),
  ];

  it('returns all entries when activeLevels is empty (no filter)', () => {
    const result = FilterEngine.apply(entries, new Set(), '');
    expect(result).toHaveLength(6);
  });

  it('returns all entries when activeLevels is empty and searchText is empty whitespace', () => {
    const result = FilterEngine.apply(entries, new Set(), '   ');
    expect(result).toHaveLength(6);
  });

  it('filters by a single level', () => {
    const result = FilterEngine.apply(entries, new Set(['Error']), '');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('Error');
  });

  it('filters by multiple levels', () => {
    const result = FilterEngine.apply(entries, new Set(['Warning', 'Error']), '');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.level)).toEqual(['Warning', 'Error']);
  });

  it('returns empty array when no entries match active level', () => {
    const result = FilterEngine.apply(entries, new Set(['Fatal']), 'nomatch');
    expect(result).toHaveLength(0);
  });

  it('text search matches message (case-insensitive)', () => {
    const result = FilterEngine.apply(entries, new Set(), 'ERROR');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('Error');
  });

  it('text search matches messageTemplate', () => {
    const withTemplate = [
      makeEntry({ line: 0, level: 'Information', message: 'rendered', messageTemplate: 'Hello {World}' }),
      makeEntry({ line: 1, level: 'Information', message: 'other' }),
    ];
    const result = FilterEngine.apply(withTemplate, new Set(), 'hello {world}');
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(0);
  });

  it('text search matches exception', () => {
    const withException = [
      makeEntry({ line: 0, level: 'Error', message: 'boom', exception: 'System.NullReferenceException: Object ref' }),
      makeEntry({ line: 1, level: 'Error', message: 'other error' }),
    ];
    const result = FilterEngine.apply(withException, new Set(), 'NullReference');
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(0);
  });

  it('text search matches property values', () => {
    const withProps = [
      makeEntry({ line: 0, level: 'Information', message: 'msg', properties: { RequestId: 'abc-123' } }),
      makeEntry({ line: 1, level: 'Information', message: 'msg', properties: { RequestId: 'xyz-999' } }),
    ];
    const result = FilterEngine.apply(withProps, new Set(), 'abc-123');
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(0);
  });

  it('text search is case-insensitive for property values', () => {
    const withProps = [
      makeEntry({ line: 0, level: 'Information', message: 'msg', properties: { Key: 'MyValue' } }),
    ];
    const result = FilterEngine.apply(withProps, new Set(), 'myvalue');
    expect(result).toHaveLength(1);
  });

  it('text search matches rawText for unparsed lines', () => {
    const withRaw = [
      makeEntry({ line: 0, level: 'Unknown', message: '', rawText: 'raw unparsed line containing UniqueToken', parseError: true }),
      makeEntry({ line: 1, level: 'Information', message: 'normal' }),
    ];
    const result = FilterEngine.apply(withRaw, new Set(), 'uniquetoken');
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(0);
  });

  it('combined level + text filter', () => {
    const result = FilterEngine.apply(entries, new Set(['Warning', 'Error']), 'error');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('Error');
  });

  it('returns empty array when no entries match search text', () => {
    const result = FilterEngine.apply(entries, new Set(), 'zzznomatch');
    expect(result).toHaveLength(0);
  });

  it('no filters returns original array reference', () => {
    const result = FilterEngine.apply(entries, new Set(), '');
    expect(result).toBe(entries);
  });
});
