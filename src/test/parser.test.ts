import { describe, it, expect } from 'vitest';
import { parseLogLine, parseLogLines, renderMessageTemplate } from '../parser';
import { serilogCompactTemplate } from '../templates/serilogCompact';
import { serilogJsonTemplate } from '../templates/serilogJson';

describe('parseLogLine', () => {
  it('parses a CLEF line correctly', () => {
    const line = '{"@t":"2024-01-15T10:30:00Z","@l":"Warning","@mt":"User {Name} logged in","@m":"User Alice logged in","Name":"Alice","RequestId":"abc123"}';
    const entry = parseLogLine(line, 0, serilogCompactTemplate);

    expect(entry.parseError).toBeUndefined();
    expect(entry.timestamp).toBe('2024-01-15T10:30:00Z');
    expect(entry.level).toBe('Warning');
    expect(entry.message).toBe('User Alice logged in');
    expect(entry.messageTemplate).toBe('User {Name} logged in');
    expect(entry.properties).toEqual({ Name: 'Alice', RequestId: 'abc123' });
    expect(entry.line).toBe(0);
  });

  it('parses a SerilogJson line correctly', () => {
    const line = '{"Timestamp":"2024-01-15T10:30:00Z","Level":"Error","MessageTemplate":"Failed {Op}","RenderedMessage":"Failed Checkout","Exception":"System.Exception: boom","Properties":{"Op":"Checkout","UserId":42}}';
    const entry = parseLogLine(line, 5, serilogJsonTemplate);

    expect(entry.parseError).toBeUndefined();
    expect(entry.timestamp).toBe('2024-01-15T10:30:00Z');
    expect(entry.level).toBe('Error');
    expect(entry.message).toBe('Failed Checkout');
    expect(entry.messageTemplate).toBe('Failed {Op}');
    expect(entry.exception).toBe('System.Exception: boom');
    expect(entry.properties).toEqual({ Op: 'Checkout', UserId: 42 });
    expect(entry.line).toBe(5);
  });

  it('returns parseError for malformed JSON', () => {
    const entry = parseLogLine('not json at all', 3, serilogCompactTemplate);

    expect(entry.parseError).toBe(true);
    expect(entry.rawText).toBe('not json at all');
    expect(entry.line).toBe(3);
  });

  it('extracts CLEF properties: all non-@ keys collected', () => {
    const line = '{"@t":"2024-01-15T10:30:00Z","@m":"test","Foo":"bar","Count":10}';
    const entry = parseLogLine(line, 0, serilogCompactTemplate);

    expect(entry.properties).toEqual({ Foo: 'bar', Count: 10 });
  });

  it('extracts SerilogJson properties from nested Properties object', () => {
    const line = '{"Timestamp":"2024-01-15T10:30:00Z","Level":"Info","RenderedMessage":"hi","Properties":{"A":1,"B":"two"}}';
    const entry = parseLogLine(line, 0, serilogJsonTemplate);

    expect(entry.properties).toEqual({ A: 1, B: 'two' });
  });

  it('uses default level when level field is missing in CLEF', () => {
    const line = '{"@t":"2024-01-15T10:30:00Z","@m":"no level"}';
    const entry = parseLogLine(line, 0, serilogCompactTemplate);

    expect(entry.level).toBe('Information');
  });
});

describe('parseLogLines', () => {
  it('parses multiple lines and skips empty lines', () => {
    const text = [
      '{"@t":"2024-01-15T10:30:00Z","@m":"first"}',
      '',
      '{"@t":"2024-01-15T10:31:00Z","@m":"second"}',
    ].join('\n');

    const entries = parseLogLines(text, serilogCompactTemplate);
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe('first');
    expect(entries[0].line).toBe(0);
    expect(entries[1].message).toBe('second');
    expect(entries[1].line).toBe(2);
  });
});

describe('renderMessageTemplate', () => {
  it('replaces tokens with property values', () => {
    const result = renderMessageTemplate('Hello {Name}, you are {Age}', {
      Name: 'Alice',
      Age: 30,
    });
    expect(result).toBe('Hello Alice, you are 30');
  });

  it('leaves unmatched tokens as-is', () => {
    const result = renderMessageTemplate('Hello {Name}, you are {Age}', {
      Name: 'Bob',
    });
    expect(result).toBe('Hello Bob, you are {Age}');
  });
});
