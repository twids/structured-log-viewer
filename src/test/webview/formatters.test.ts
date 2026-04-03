import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatProperties,
  formatException,
  escapeHtml,
} from '../../webview/formatters';

describe('formatTimestamp', () => {
  it('formats valid ISO timestamp to HH:mm:ss.SSS', () => {
    const result = formatTimestamp('2024-01-15T10:25:37.123Z');
    expect(result).toBe('10:25:37.123');
  });

  it('formats midnight correctly', () => {
    const result = formatTimestamp('2024-01-15T00:00:00.000Z');
    expect(result).toBe('00:00:00.000');
  });

  it('zero-pads hours, minutes, seconds, and milliseconds', () => {
    const result = formatTimestamp('2024-06-01T01:02:03.004Z');
    expect(result).toBe('01:02:03.004');
  });

  it('returns input unchanged for invalid timestamp', () => {
    const result = formatTimestamp('not-a-date');
    expect(result).toBe('not-a-date');
  });

  it('returns empty string unchanged', () => {
    const result = formatTimestamp('');
    expect(result).toBe('');
  });
});

describe('formatProperties', () => {
  it('returns empty string for empty properties', () => {
    expect(formatProperties({})).toBe('');
  });

  it('returns empty string for empty object when explicitly truncated', () => {
    expect(formatProperties({}, true)).toBe('');
  });

  it('shows first 3 key=value pairs when truncated with more than 3 keys', () => {
    const props = { foo: 'bar', baz: 42, qux: true, extra: 'x' };
    const result = formatProperties(props, true);
    expect(result).toContain('foo=bar');
    expect(result).toContain('baz=42');
    expect(result).toContain('qux=true');
  });

  it('adds ellipsis when truncated and more than 3 keys exist', () => {
    const props = { a: 1, b: 2, c: 3, d: 4 };
    const result = formatProperties(props, true);
    expect(result).toContain('...');
  });

  it('does not add ellipsis when 3 or fewer properties and truncated', () => {
    const props = { a: 1, b: 2 };
    const result = formatProperties(props, true);
    expect(result).not.toContain('...');
  });

  it('truncates by default (truncate defaults to true)', () => {
    const props = { a: 1, b: 2, c: 3, d: 4 };
    const result = formatProperties(props);
    expect(result).toContain('...');
  });

  it('shows all properties as formatted JSON when not truncated', () => {
    const props = { a: 1, b: 'hello', c: true };
    const result = formatProperties(props, false);
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
    expect(result).toContain('"c"');
    expect(result).toContain('"hello"');
  });
});

describe('formatException', () => {
  it('returns exception text as-is', () => {
    const text = 'System.Exception: Something went wrong';
    expect(formatException(text)).toBe(text);
  });

  it('preserves newlines and stack trace formatting', () => {
    const text =
      'System.Exception: Something went wrong\n  at SomeMethod() in File.cs:line 42\n  at AnotherMethod()';
    expect(formatException(text)).toBe(text);
  });

  it('handles empty string', () => {
    expect(formatException('')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes < character', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes > character', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes & character', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes " character', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('returns unchanged text with no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x" & b>')).toBe('&lt;a href=&quot;x&quot; &amp; b&gt;');
  });

  it('escapes & before < and > to avoid double-encoding', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});
