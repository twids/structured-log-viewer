// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualTable } from '../../webview/table';
import { getDefaultColumns } from '../../webview/columns';
import { LogEntry } from '../../templates/types';

function makeEntry(
  line: number,
  overrides: Partial<LogEntry> = {},
): LogEntry {
  return {
    line,
    timestamp: `2024-01-01T10:00:${String(line % 60).padStart(2, '0')}.000Z`,
    level: 'Information',
    message: `Message ${line}`,
    properties: {},
    raw: {},
    ...overrides,
  };
}

describe('getDefaultColumns', () => {
  it('returns 5 columns', () => {
    const cols = getDefaultColumns();
    expect(cols).toHaveLength(5);
  });

  it('includes line, timestamp, level, message, properties columns', () => {
    const cols = getDefaultColumns();
    const ids = cols.map((c) => c.id);
    expect(ids).toContain('line');
    expect(ids).toContain('timestamp');
    expect(ids).toContain('level');
    expect(ids).toContain('message');
    expect(ids).toContain('properties');
  });

  it('renders line number as 1-based', () => {
    const cols = getDefaultColumns();
    const lineCol = cols.find((c) => c.id === 'line')!;
    expect(lineCol.render(makeEntry(0))).toBe('1');
    expect(lineCol.render(makeEntry(9))).toBe('10');
  });

  it('renders level badge with level class', () => {
    const cols = getDefaultColumns();
    const levelCol = cols.find((c) => c.id === 'level')!;
    const html = levelCol.render(makeEntry(0, { level: 'Error' }));
    expect(html).toContain('level-badge');
    expect(html).toContain('level-error');
    expect(html).toContain('Error');
  });

  it('renders message from message field', () => {
    const cols = getDefaultColumns();
    const msgCol = cols.find((c) => c.id === 'message')!;
    const html = msgCol.render(makeEntry(0, { message: 'Hello World' }));
    expect(html).toContain('Hello World');
  });

  it('falls back to messageTemplate when message is empty', () => {
    const cols = getDefaultColumns();
    const msgCol = cols.find((c) => c.id === 'message')!;
    const html = msgCol.render(
      makeEntry(0, { message: '', messageTemplate: 'No message template' }),
    );
    expect(html).toContain('No message template');
  });

  it('renders empty string for properties when props object is empty', () => {
    const cols = getDefaultColumns();
    const propsCol = cols.find((c) => c.id === 'properties')!;
    const html = propsCol.render(makeEntry(0, { properties: {} }));
    expect(html).toBe('');
  });

  it('renders props-preview span when properties exist', () => {
    const cols = getDefaultColumns();
    const propsCol = cols.find((c) => c.id === 'properties')!;
    const html = propsCol.render(makeEntry(0, { properties: { userId: 42 } }));
    expect(html).toContain('props-preview');
    expect(html).toContain('userId=42');
  });
});

describe('VirtualTable', () => {
  let container: HTMLElement;
  let table: VirtualTable;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '400px';
    container.style.overflow = 'auto';
    document.body.appendChild(container);
    table = new VirtualTable(container);
  });

  afterEach(() => {
    table.destroy();
    container.remove();
  });

  it('initializes with empty visible range', () => {
    expect(table.getVisibleRange()).toEqual({ start: 0, end: 0 });
  });

  it('setData with empty array results in empty visible range', () => {
    table.setData([]);
    expect(table.getVisibleRange()).toEqual({ start: 0, end: 0 });
  });

  it('setData updates internal data and renders rows', () => {
    const entries = Array.from({ length: 100 }, (_, i) => makeEntry(i));
    table.setData(entries);
    const range = table.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBeGreaterThan(0);
    expect(range.end).toBeLessThan(100);
  });

  it('getVisibleRange starts at 0 with no scroll', () => {
    const entries = Array.from({ length: 1000 }, (_, i) => makeEntry(i));
    table.setData(entries);
    const range = table.getVisibleRange();
    expect(range.start).toBe(0);
  });

  it('getVisibleRange reflects scroll position', () => {
    const entries = Array.from({ length: 1000 }, (_, i) => makeEntry(i));
    table.setData(entries);
    // rowHeight = 28, overscan = 5; scrollTop 280 = 10 rows
    container.scrollTop = 280;
    const range = table.getVisibleRange();
    // start = max(0, floor(280/28) - 5) = max(0, 10-5) = 5
    expect(range.start).toBe(5);
    expect(range.end).toBeGreaterThan(10);
  });

  it('renders rows in #table-container after setData', () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry(i));
    table.setData(entries);
    const rows = container.querySelectorAll('.log-row');
    expect(rows.length).toBe(10); // all 10 fit in viewport
  });

  it('rows have data-index attribute', () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry(i));
    table.setData(entries);
    const firstRow = container.querySelector('.log-row[data-index="0"]');
    expect(firstRow).not.toBeNull();
  });

  it('expandable rows have expandable class when they have properties', () => {
    const entries = [makeEntry(0, { properties: { key: 'value' } })];
    table.setData(entries);
    const row = container.querySelector('.log-row');
    expect(row?.classList.contains('expandable')).toBe(true);
  });

  it('expandable rows have expandable class when they have exception', () => {
    const entries = [makeEntry(0, { exception: 'Error occurred' })];
    table.setData(entries);
    const row = container.querySelector('.log-row');
    expect(row?.classList.contains('expandable')).toBe(true);
  });

  it('rows without exception or properties are not expandable', () => {
    const entries = [makeEntry(0, { properties: {}, exception: undefined })];
    table.setData(entries);
    const row = container.querySelector('.log-row');
    expect(row?.classList.contains('expandable')).toBe(false);
  });

  it('toggleExpand adds expanded class to row', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(i, { properties: { x: i } }),
    );
    table.setData(entries);

    table.toggleExpand(0);
    const row = container.querySelector('.log-row[data-index="0"]');
    expect(row?.classList.contains('expanded')).toBe(true);
  });

  it('toggleExpand removes expanded class on second call', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(i, { properties: { x: i } }),
    );
    table.setData(entries);

    table.toggleExpand(0);
    table.toggleExpand(0);
    const row = container.querySelector('.log-row[data-index="0"]');
    expect(row?.classList.contains('expanded')).toBe(false);
  });

  it('toggleExpand shows expansion panel with properties', () => {
    const entries = [makeEntry(0, { properties: { userId: 99 } })];
    table.setData(entries);
    table.toggleExpand(0);

    const panel = container.querySelector('.expansion-panel');
    expect(panel).not.toBeNull();
    const detail = panel?.querySelector('.properties-detail');
    expect(detail).not.toBeNull();
    expect(detail?.textContent).toContain('userId');
  });

  it('toggleExpand shows expansion panel with exception', () => {
    const entries = [makeEntry(0, { exception: 'System.Exception: boom' })];
    table.setData(entries);
    table.toggleExpand(0);

    const exText = container.querySelector('.exception-text');
    expect(exText).not.toBeNull();
    expect(exText?.textContent).toContain('System.Exception: boom');
  });

  it('header row is rendered with column labels', () => {
    const labels = container.querySelectorAll('.log-header-cell');
    expect(labels.length).toBe(5);
    const texts = Array.from(labels).map((el) => el.textContent);
    expect(texts).toContain('#');
    expect(texts).toContain('Timestamp');
    expect(texts).toContain('Level');
    expect(texts).toContain('Message');
    expect(texts).toContain('Properties');
  });

  it('destroy removes DOM elements created by the table', () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry(i));
    table.setData(entries);

    table.destroy();
    // After destroy, header and body should be removed
    expect(container.querySelector('.log-table-header')).toBeNull();
    expect(container.querySelector('.log-table-body')).toBeNull();
  });
});
