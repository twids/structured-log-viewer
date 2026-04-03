import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseLogLines } from '../parser';
import { serilogCompactTemplate } from '../templates/serilogCompact';
import { serilogJsonTemplate } from '../templates/serilogJson';
import { detectTemplate } from '../templates/registry';

const samplesDir = resolve(__dirname, '../../samples');

describe('sample.clef', () => {
  const text = readFileSync(resolve(samplesDir, 'sample.clef'), 'utf-8');

  it('parses ~50 entries with no parse errors', () => {
    const entries = parseLogLines(text, serilogCompactTemplate);
    expect(entries.length).toBe(50);
    const errors = entries.filter((e) => e.parseError);
    expect(errors).toHaveLength(0);
  });

  it('contains various log levels', () => {
    const entries = parseLogLines(text, serilogCompactTemplate);
    const levels = new Set(entries.map((e) => e.level));
    expect(levels).toContain('Verbose');
    expect(levels).toContain('Debug');
    expect(levels).toContain('Information');
    expect(levels).toContain('Warning');
    expect(levels).toContain('Error');
    expect(levels).toContain('Fatal');
  });

  it('has entries with exceptions', () => {
    const entries = parseLogLines(text, serilogCompactTemplate);
    const withExceptions = entries.filter((e) => e.exception);
    expect(withExceptions.length).toBeGreaterThanOrEqual(2);
  });

  it('has entries with eventId', () => {
    const entries = parseLogLines(text, serilogCompactTemplate);
    const withEventId = entries.filter((e) => e.eventId);
    expect(withEventId.length).toBeGreaterThanOrEqual(1);
  });

  it('has entries that default to Information when @l is missing', () => {
    const entries = parseLogLines(text, serilogCompactTemplate);
    // Line 4 (index 3) has no @l field
    const noLevelEntry = entries[3];
    expect(noLevelEntry.level).toBe('Information');
  });

  it('is auto-detected as CLEF', () => {
    const lines = text.split('\n').filter((l) => l.trim());
    const detected = detectTemplate(lines);
    expect(detected).not.toBeNull();
    expect(detected!.name).toBe('Serilog Compact (CLEF)');
  });
});

describe('sample-verbose.log', () => {
  const text = readFileSync(resolve(samplesDir, 'sample-verbose.log'), 'utf-8');

  it('parses ~50 entries with no parse errors', () => {
    const entries = parseLogLines(text, serilogJsonTemplate);
    expect(entries.length).toBe(50);
    const errors = entries.filter((e) => e.parseError);
    expect(errors).toHaveLength(0);
  });

  it('contains various log levels', () => {
    const entries = parseLogLines(text, serilogJsonTemplate);
    const levels = new Set(entries.map((e) => e.level));
    expect(levels).toContain('Verbose');
    expect(levels).toContain('Debug');
    expect(levels).toContain('Information');
    expect(levels).toContain('Warning');
    expect(levels).toContain('Error');
    expect(levels).toContain('Fatal');
  });

  it('has entries with exceptions', () => {
    const entries = parseLogLines(text, serilogJsonTemplate);
    const withExceptions = entries.filter((e) => e.exception);
    expect(withExceptions.length).toBeGreaterThanOrEqual(2);
  });

  it('has entries with nested properties', () => {
    const entries = parseLogLines(text, serilogJsonTemplate);
    const withProps = entries.filter(
      (e) => Object.keys(e.properties).length > 0,
    );
    expect(withProps.length).toBe(50);
  });

  it('is auto-detected as Serilog JSON', () => {
    const lines = text.split('\n').filter((l) => l.trim());
    const detected = detectTemplate(lines);
    expect(detected).not.toBeNull();
    expect(detected!.name).toBe('Serilog JSON');
  });
});
