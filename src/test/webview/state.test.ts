import { describe, it, expect, vi } from 'vitest';
import { ViewerState, ViewerStateData } from '../../webview/state';
import { LogEntry } from '../../templates/types';

function makeEntry(line: number): LogEntry {
  return {
    line,
    timestamp: `2024-01-01T00:00:0${line}.000Z`,
    level: 'Information',
    message: `Message ${line}`,
    properties: {},
    raw: {},
  };
}

describe('ViewerState', () => {
  it('initializes with empty entries and default values', () => {
    const state = new ViewerState();
    const data = state.get();

    expect(data.entries).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.currentPage).toBe(0);
    expect(data.pageSize).toBeGreaterThan(0);
    expect(data.activeTemplateName).toBe('');
    expect(data.templateNames).toEqual([]);
    expect(data.viewMode).toBe('table');
    expect(data.activeLevels).toBeInstanceOf(Set);
    expect(data.activeLevels.size).toBe(0);
    expect(data.searchText).toBe('');
  });

  it('setEntries updates entries, totalCount, page, and pageSize', () => {
    const state = new ViewerState();
    const entries = [makeEntry(0), makeEntry(1)];

    state.setEntries(entries, 50, 2, 25);

    const data = state.get();
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].line).toBe(0);
    expect(data.entries[1].line).toBe(1);
    expect(data.totalCount).toBe(50);
    expect(data.currentPage).toBe(2);
    expect(data.pageSize).toBe(25);
  });

  it('setEntries replaces existing entries', () => {
    const state = new ViewerState();
    state.setEntries([makeEntry(0), makeEntry(1)], 10, 0, 10);
    state.setEntries([makeEntry(5)], 10, 0, 10);

    expect(state.get().entries).toHaveLength(1);
    expect(state.get().entries[0].line).toBe(5);
  });

  it('appendEntries adds to existing entries', () => {
    const state = new ViewerState();
    state.setEntries([makeEntry(0), makeEntry(1)], 5, 0, 2);
    state.appendEntries([makeEntry(2), makeEntry(3)], 5);

    const data = state.get();
    expect(data.entries).toHaveLength(4);
    expect(data.entries[2].line).toBe(2);
    expect(data.entries[3].line).toBe(3);
  });

  it('appendEntries updates totalCount', () => {
    const state = new ViewerState();
    state.setEntries([makeEntry(0)], 100, 0, 50);
    state.appendEntries([makeEntry(1)], 200);

    expect(state.get().totalCount).toBe(200);
  });

  it('setTemplates updates templateNames and activeTemplateName', () => {
    const state = new ViewerState();
    state.setTemplates(['CLEF', 'Serilog JSON', 'Custom'], 'CLEF');

    const data = state.get();
    expect(data.templateNames).toEqual(['CLEF', 'Serilog JSON', 'Custom']);
    expect(data.activeTemplateName).toBe('CLEF');
  });

  it('setTemplates updates active template independently', () => {
    const state = new ViewerState();
    state.setTemplates(['CLEF', 'Serilog JSON'], 'CLEF');
    state.setTemplates(['CLEF', 'Serilog JSON'], 'Serilog JSON');

    expect(state.get().activeTemplateName).toBe('Serilog JSON');
  });

  it('setViewMode switches from table to raw', () => {
    const state = new ViewerState();
    expect(state.get().viewMode).toBe('table');

    state.setViewMode('raw');
    expect(state.get().viewMode).toBe('raw');
  });

  it('setViewMode switches back from raw to table', () => {
    const state = new ViewerState();
    state.setViewMode('raw');
    state.setViewMode('table');

    expect(state.get().viewMode).toBe('table');
  });

  it('setActiveLevels updates the active levels set', () => {
    const state = new ViewerState();
    const levels = new Set(['Information', 'Warning', 'Error']);
    state.setActiveLevels(levels);

    const data = state.get();
    expect(data.activeLevels.has('Information')).toBe(true);
    expect(data.activeLevels.has('Warning')).toBe(true);
    expect(data.activeLevels.has('Error')).toBe(true);
    expect(data.activeLevels.has('Debug')).toBe(false);
  });

  it('setActiveLevels replaces previous active levels', () => {
    const state = new ViewerState();
    state.setActiveLevels(new Set(['Information', 'Warning']));
    state.setActiveLevels(new Set(['Error']));

    const data = state.get();
    expect(data.activeLevels.has('Information')).toBe(false);
    expect(data.activeLevels.has('Error')).toBe(true);
  });

  it('setSearchText updates search text', () => {
    const state = new ViewerState();
    state.setSearchText('user login');

    expect(state.get().searchText).toBe('user login');
  });

  it('setSearchText can be cleared', () => {
    const state = new ViewerState();
    state.setSearchText('something');
    state.setSearchText('');

    expect(state.get().searchText).toBe('');
  });

  it('onChange listener is called when setEntries is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.setEntries([makeEntry(0)], 1, 0, 1);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(state.get());
  });

  it('onChange listener is called when appendEntries is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.appendEntries([makeEntry(0)], 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('onChange listener is called when setTemplates is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.setTemplates(['CLEF'], 'CLEF');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('onChange listener is called when setViewMode is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.setViewMode('raw');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('onChange listener is called when setActiveLevels is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.setActiveLevels(new Set(['Information']));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('onChange listener is called when setSearchText is invoked', () => {
    const state = new ViewerState();
    const listener = vi.fn();
    state.onChange(listener);

    state.setSearchText('query');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('multiple listeners all get notified on state change', () => {
    const state = new ViewerState();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    state.onChange(listener1);
    state.onChange(listener2);
    state.onChange(listener3);

    state.setEntries([makeEntry(0)], 1, 0, 1);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener3).toHaveBeenCalledTimes(1);
  });

  it('listeners receive the updated state data', () => {
    const state = new ViewerState();
    let received: ViewerStateData | undefined;
    state.onChange((data) => { received = data; });

    const entries = [makeEntry(0)];
    state.setEntries(entries, 99, 1, 50);

    expect(received).toBeDefined();
    expect(received!.totalCount).toBe(99);
    expect(received!.currentPage).toBe(1);
    expect(received!.pageSize).toBe(50);
  });
});
