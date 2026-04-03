import { describe, it, expect } from 'vitest';
import { LogDocument } from '../logDocument';
import { serilogCompactTemplate } from '../templates/serilogCompact';
import { serilogJsonTemplate } from '../templates/serilogJson';

const CLEF_LINES = [
  '{"@t":"2024-01-15T10:00:00.000Z","@l":"Information","@m":"Starting up","@mt":"Starting up","App":"MyApp"}',
  '{"@t":"2024-01-15T10:00:01.000Z","@l":"Warning","@m":"Disk space low","@mt":"Disk space low","DiskPct":90}',
  '{"@t":"2024-01-15T10:00:02.000Z","@l":"Error","@m":"Connection failed","@mt":"Connection failed to {Host}","Host":"db-01","@x":"System.Exception: timeout"}',
  '{"@t":"2024-01-15T10:00:03.000Z","@l":"Debug","@m":"Cache hit","@mt":"Cache hit"}',
  '{"@t":"2024-01-15T10:00:04.000Z","@l":"Information","@m":"Request received","@mt":"Request received","Path":"/api"}',
].join('\n');

const SERILOG_JSON_LINES = [
  '{"Timestamp":"2024-01-15T10:00:00.000Z","Level":"Information","RenderedMessage":"Hello World","MessageTemplate":"Hello {Name}","Properties":{"Name":"World"}}',
  '{"Timestamp":"2024-01-15T10:00:01.000Z","Level":"Error","RenderedMessage":"Oops","MessageTemplate":"Oops","Properties":{}}',
].join('\n');

describe('LogDocument', () => {
  describe('fromText', () => {
    it('parses CLEF text and auto-detects template', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      expect(doc.entries).toHaveLength(5);
      expect(doc.template.name).toBe('Serilog Compact (CLEF)');
    });

    it('parses Serilog JSON text and auto-detects template', () => {
      const doc = LogDocument.fromText('test.log', SERILOG_JSON_LINES);
      expect(doc.entries).toHaveLength(2);
      expect(doc.template.name).toBe('Serilog JSON');
    });

    it('falls back to generic template when no template detected', () => {
      const text = '{"foo":"bar","baz":123}\n{"foo":"qux","baz":456}';
      const doc = LogDocument.fromText('test.log', text);
      expect(doc.entries).toHaveLength(2);
      expect(doc.template.name).toBe('Generic JSON');
    });

    it('handles non-JSON lines as parse errors', () => {
      const text = 'not json at all\n{"@t":"2024-01-15T10:00:00.000Z","@l":"Info","@m":"ok"}';
      const doc = LogDocument.fromText('test.log', text);
      expect(doc.entries).toHaveLength(2);
      expect(doc.entries[0].parseError).toBe(true);
      expect(doc.entries[0].rawText).toBe('not json at all');
    });

    it('stores rawText for raw view', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      expect(doc.rawText).toBe(CLEF_LINES);
    });

    it('accepts user templates for detection', () => {
      const customTemplate = {
        name: 'Custom',
        detect: ['foo', 'baz'],
        mappings: {
          timestamp: 'foo',
          level: 'baz',
          message: 'foo',
        },
      };
      const text = '{"foo":"bar","baz":"Info"}';
      const doc = LogDocument.fromText('test.log', text, [customTemplate]);
      expect(doc.template.name).toBe('Custom');
    });

    it('handles empty text', () => {
      const doc = LogDocument.fromText('empty.log', '');
      expect(doc.entries).toHaveLength(0);
      expect(doc.template.name).toBe('Generic JSON');
    });
  });

  describe('getPage', () => {
    it('returns the first page of entries', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(0, 2);
      expect(page).toHaveLength(2);
      expect(page[0].message).toBe('Starting up');
      expect(page[1].message).toBe('Disk space low');
    });

    it('returns the second page of entries', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(1, 2);
      expect(page).toHaveLength(2);
      expect(page[0].message).toBe('Connection failed');
      expect(page[1].message).toBe('Cache hit');
    });

    it('returns a partial last page', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(2, 2);
      expect(page).toHaveLength(1);
      expect(page[0].message).toBe('Request received');
    });

    it('returns empty for out-of-bounds page', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(99, 2);
      expect(page).toHaveLength(0);
    });

    it('returns all entries when pageSize covers everything', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(0, 5000);
      expect(page).toHaveLength(5);
    });

    it('returns empty for negative page', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const page = doc.getPage(-1, 2);
      expect(page).toHaveLength(0);
    });
  });

  describe('reparse', () => {
    it('re-parses with a different template', () => {
      const doc = LogDocument.fromText('test.log', SERILOG_JSON_LINES);
      expect(doc.template.name).toBe('Serilog JSON');
      expect(doc.entries[0].message).toBe('Hello World');

      // Reparse with CLEF template — fields won't match, but it should still work
      doc.reparse(serilogCompactTemplate);
      expect(doc.template.name).toBe('Serilog Compact (CLEF)');
      // Serilog JSON fields don't map to CLEF paths, so message should be empty
      expect(doc.entries[0].message).toBe('');
      expect(doc.entries).toHaveLength(2);
    });

    it('preserves entry count after reparse', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const originalCount = doc.entries.length;
      doc.reparse(serilogJsonTemplate);
      expect(doc.entries).toHaveLength(originalCount);
    });
  });

  describe('dispose', () => {
    it('clears entries on dispose', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      expect(doc.entries.length).toBeGreaterThan(0);
      doc.dispose();
      expect(doc.entries).toHaveLength(0);
    });
  });

  describe('appendText', () => {
    it('parses new lines with current template', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const originalCount = doc.entries.length;
      const newLine = '{"@t":"2024-01-15T10:00:05.000Z","@l":"Information","@m":"New entry","@mt":"New entry"}';
      const newEntries = doc.appendText(newLine);
      expect(doc.entries).toHaveLength(originalCount + 1);
      expect(newEntries).toHaveLength(1);
      expect(newEntries[0].message).toBe('New entry');
    });

    it('returns only the new entries', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const newLines = [
        '{"@t":"2024-01-15T10:00:05.000Z","@l":"Information","@m":"Entry A","@mt":"Entry A"}',
        '{"@t":"2024-01-15T10:00:06.000Z","@l":"Warning","@m":"Entry B","@mt":"Entry B"}',
      ].join('\n');
      const newEntries = doc.appendText(newLines);
      expect(newEntries).toHaveLength(2);
      expect(newEntries[0].message).toBe('Entry A');
      expect(newEntries[1].message).toBe('Entry B');
    });

    it('updates rawText with appended text', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const newLine = '{"@t":"2024-01-15T10:00:05.000Z","@l":"Information","@m":"Appended","@mt":"Appended"}';
      doc.appendText(newLine);
      expect(doc.rawText).toContain('Appended');
    });

    it('handles empty append text', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      const originalCount = doc.entries.length;
      const newEntries = doc.appendText('');
      expect(newEntries).toHaveLength(0);
      expect(doc.entries).toHaveLength(originalCount);
    });
  });

  describe('getTotalPages', () => {
    it('calculates correctly with exact division', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      // 5 entries, pageSize 5 → 1 page
      expect(doc.getTotalPages(5)).toBe(1);
    });

    it('calculates correctly with remainder', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      // 5 entries, pageSize 2 → 3 pages
      expect(doc.getTotalPages(2)).toBe(3);
    });

    it('returns 0 for empty entries', () => {
      const doc = LogDocument.fromText('empty.log', '');
      expect(doc.getTotalPages(10)).toBe(0);
    });

    it('returns 1 when entries fit in one page', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      expect(doc.getTotalPages(5000)).toBe(1);
    });
  });

  describe('byteLength', () => {
    it('stores the byte length of the raw text', () => {
      const doc = LogDocument.fromText('test.clef', CLEF_LINES);
      expect(doc.byteLength).toBe(new TextEncoder().encode(CLEF_LINES).byteLength);
    });
  });
});
