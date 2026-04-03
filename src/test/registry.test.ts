import { describe, it, expect } from 'vitest';
import {
  getBuiltInTemplates,
  getAllTemplates,
  detectTemplate,
} from '../templates/registry';
import { LogTemplate } from '../templates/types';

describe('getBuiltInTemplates', () => {
  it('returns 2 built-in templates', () => {
    const templates = getBuiltInTemplates();
    expect(templates).toHaveLength(2);
  });
});

describe('detectTemplate', () => {
  it('detects CLEF template from sample line', () => {
    const lines = ['{"@t":"2024-01-15T10:30:00Z","@m":"hello"}'];
    const result = detectTemplate(lines);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Serilog Compact (CLEF)');
  });

  it('detects SerilogJson template from sample line', () => {
    const lines = [
      '{"Timestamp":"2024-01-15T10:30:00Z","Level":"Info","RenderedMessage":"hi"}',
    ];
    const result = detectTemplate(lines);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Serilog JSON');
  });

  it('returns null for unknown JSON format', () => {
    const lines = ['{"foo":"bar","baz":42}'];
    const result = detectTemplate(lines);
    expect(result).toBeNull();
  });

  it('returns null for non-JSON lines', () => {
    const lines = ['this is not json'];
    const result = detectTemplate(lines);
    expect(result).toBeNull();
  });
});

describe('getAllTemplates', () => {
  it('merges user templates with built-in templates', () => {
    const userTemplate: LogTemplate = {
      name: 'Custom',
      mappings: { timestamp: 'ts', level: 'lvl', message: 'msg' },
    };
    const all = getAllTemplates([userTemplate]);
    expect(all).toHaveLength(3);
    expect(all.some((t: LogTemplate) => t.name === 'Custom')).toBe(true);
  });

  it('returns only built-in templates when no user templates provided', () => {
    const all = getAllTemplates();
    expect(all).toHaveLength(2);
  });
});

describe('detectTemplate with user templates', () => {
  it('user template with detect array is used in auto-detection', () => {
    const userTemplate: LogTemplate = {
      name: 'MyFormat',
      detect: ['ts', 'severity'],
      mappings: { timestamp: 'ts', level: 'severity', message: 'msg' },
    };
    const lines = ['{"ts":"2024-01-15","severity":"ERROR","msg":"fail"}'];
    const result = detectTemplate(lines, [userTemplate]);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('MyFormat');
  });
});
