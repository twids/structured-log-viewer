import { describe, it, expect } from 'vitest';
import { normalizeLevel, getByPath, LogTemplate } from '../templates/types';

describe('normalizeLevel', () => {
  const baseTemplate: LogTemplate = {
    name: 'test',
    mappings: { timestamp: 't', level: 'l', message: 'm' },
  };

  it('normalizes "Information" to "Information"', () => {
    expect(normalizeLevel('Information', baseTemplate)).toBe('Information');
  });

  it('normalizes "info" to "Information"', () => {
    expect(normalizeLevel('info', baseTemplate)).toBe('Information');
  });

  it('normalizes "ERR" to "Error"', () => {
    expect(normalizeLevel('ERR', baseTemplate)).toBe('Error');
  });

  it('normalizes "fatal" to "Fatal"', () => {
    expect(normalizeLevel('fatal', baseTemplate)).toBe('Fatal');
  });

  it('normalizes "Verbose" to "Verbose"', () => {
    expect(normalizeLevel('Verbose', baseTemplate)).toBe('Verbose');
  });

  it('returns default "Information" when raw is null and defaultLevel is set', () => {
    const tmpl: LogTemplate = {
      ...baseTemplate,
      defaultLevel: 'Information',
    };
    expect(normalizeLevel(null, tmpl)).toBe('Information');
  });

  it('returns "Information" when raw is null with no defaultLevel (falls back to Information)', () => {
    expect(normalizeLevel(null, baseTemplate)).toBe('Information');
  });

  it('uses levelMap to override normalization', () => {
    const tmpl: LogTemplate = {
      ...baseTemplate,
      levelMap: { 'MY_CUSTOM': 'Warning' },
    };
    expect(normalizeLevel('MY_CUSTOM', tmpl)).toBe('Warning');
  });

  it('levelMap value is itself normalized', () => {
    const tmpl: LogTemplate = {
      ...baseTemplate,
      levelMap: { 'X': 'err' },
    };
    expect(normalizeLevel('X', tmpl)).toBe('Error');
  });
});

describe('getByPath', () => {
  it('resolves a nested dot-notation path', () => {
    const obj = { Properties: { EventId: 42 } };
    expect(getByPath(obj, 'Properties.EventId')).toBe(42);
  });

  it('returns undefined for missing paths', () => {
    const obj = { a: 1 };
    expect(getByPath(obj, 'b.c')).toBeUndefined();
  });

  it('handles null intermediate values', () => {
    const obj = { a: null } as unknown as Record<string, unknown>;
    expect(getByPath(obj, 'a.b')).toBeUndefined();
  });

  it('resolves a simple top-level path', () => {
    const obj = { level: 'Info' };
    expect(getByPath(obj, 'level')).toBe('Info');
  });
});
