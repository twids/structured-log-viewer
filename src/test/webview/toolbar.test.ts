// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toolbar, ToolbarEvents } from '../../webview/toolbar';

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makeEvents(overrides: Partial<ToolbarEvents> = {}): ToolbarEvents {
  return {
    onLevelToggle: vi.fn(),
    onSearch: vi.fn(),
    onTemplateChange: vi.fn(),
    onViewModeChange: vi.fn(),
    ...overrides,
  };
}

describe('Toolbar', () => {
  let container: HTMLElement;
  let toolbar: Toolbar;
  let events: ToolbarEvents;

  beforeEach(() => {
    container = makeContainer();
    events = makeEvents();
    toolbar = new Toolbar(container, events);
  });

  afterEach(() => {
    toolbar.destroy();
    document.body.removeChild(container);
  });

  it('renders level buttons for all 6 standard levels', () => {
    const buttons = container.querySelectorAll('.level-btn');
    expect(buttons).toHaveLength(6);
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels).toContain('Verbose');
    expect(labels).toContain('Debug');
    expect(labels).toContain('Information');
    expect(labels).toContain('Warning');
    expect(labels).toContain('Error');
    expect(labels).toContain('Fatal');
  });

  it('renders search input with placeholder', () => {
    const input = container.querySelector<HTMLInputElement>('.search-input');
    expect(input).not.toBeNull();
    expect(input!.placeholder).toBe('Search logs...');
  });

  it('renders template select dropdown', () => {
    const select = container.querySelector('.template-select');
    expect(select).not.toBeNull();
  });

  it('renders view toggle button', () => {
    const btn = container.querySelector('.view-toggle');
    expect(btn).not.toBeNull();
  });

  describe('level button clicks', () => {
    it('clicking a level calls onLevelToggle with only that level', () => {
      const errorBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Error',
      ) as HTMLElement;
      errorBtn.click();
      expect(events.onLevelToggle).toHaveBeenCalledTimes(1);
      const levels = (events.onLevelToggle as ReturnType<typeof vi.fn>).mock.calls[0][0] as Set<string>;
      expect(levels).toBeInstanceOf(Set);
      expect(levels.size).toBe(1);
      expect(levels.has('Error')).toBe(true);
    });

    it('clicking the active level a second time deactivates it (back to show-all)', () => {
      const errorBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Error',
      ) as HTMLElement;
      errorBtn.click(); // activate
      errorBtn.click(); // deactivate
      expect(events.onLevelToggle).toHaveBeenCalledTimes(2);
      const secondCallLevels = (events.onLevelToggle as ReturnType<typeof vi.fn>).mock.calls[1][0] as Set<string>;
      expect(secondCallLevels.size).toBe(0);
    });

    it('shift+click adds a level additively', () => {
      const errorBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Error',
      ) as HTMLElement;
      const warnBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Warning',
      ) as HTMLElement;

      errorBtn.click(); // activate Error
      warnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));

      const lastLevels = (events.onLevelToggle as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as Set<string>;
      expect(lastLevels.has('Error')).toBe(true);
      expect(lastLevels.has('Warning')).toBe(true);
    });

    it('shift+click on an already-active level removes it', () => {
      const errorBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Error',
      ) as HTMLElement;
      const warnBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Warning',
      ) as HTMLElement;

      errorBtn.click();
      warnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
      errorBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));

      const lastLevels = (events.onLevelToggle as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as Set<string>;
      expect(lastLevels.has('Error')).toBe(false);
      expect(lastLevels.has('Warning')).toBe(true);
    });
  });

  describe('search input', () => {
    it('calls onSearch after debounce delay', async () => {
      vi.useFakeTimers();
      const input = container.querySelector<HTMLInputElement>('.search-input')!;
      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      expect(events.onSearch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      expect(events.onSearch).toHaveBeenCalledWith('hello');
      vi.useRealTimers();
    });

    it('debounces — only fires once for rapid input', async () => {
      vi.useFakeTimers();
      const input = container.querySelector<HTMLInputElement>('.search-input')!;
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      input.value = 'ab';
      input.dispatchEvent(new Event('input'));
      input.value = 'abc';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(250);
      expect(events.onSearch).toHaveBeenCalledTimes(1);
      expect(events.onSearch).toHaveBeenCalledWith('abc');
      vi.useRealTimers();
    });
  });

  describe('template select', () => {
    it('calls onTemplateChange when selection changes', () => {
      toolbar.setTemplates(['CLEF', 'Serilog JSON'], 'CLEF');
      const select = container.querySelector<HTMLSelectElement>('.template-select')!;
      select.value = 'Serilog JSON';
      select.dispatchEvent(new Event('change'));
      expect(events.onTemplateChange).toHaveBeenCalledWith('Serilog JSON');
    });
  });

  describe('setTemplates', () => {
    it('populates dropdown options', () => {
      toolbar.setTemplates(['CLEF', 'Serilog JSON', 'Custom'], 'CLEF');
      const select = container.querySelector<HTMLSelectElement>('.template-select')!;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain('CLEF');
      expect(options).toContain('Serilog JSON');
      expect(options).toContain('Custom');
    });

    it('sets the active template as selected', () => {
      toolbar.setTemplates(['CLEF', 'Serilog JSON'], 'Serilog JSON');
      const select = container.querySelector<HTMLSelectElement>('.template-select')!;
      expect(select.value).toBe('Serilog JSON');
    });
  });

  describe('setActiveLevels', () => {
    it('marks active level buttons with "active" class', () => {
      toolbar.setActiveLevels(new Set(['Error', 'Warning']));
      const errorBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Error',
      );
      const warnBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Warning',
      );
      const verboseBtn = Array.from(container.querySelectorAll('.level-btn')).find(
        (b) => b.textContent?.trim() === 'Verbose',
      );
      expect(errorBtn?.classList.contains('active')).toBe(true);
      expect(warnBtn?.classList.contains('active')).toBe(true);
      expect(verboseBtn?.classList.contains('active')).toBe(false);
    });

    it('removes active class from all buttons when set is empty', () => {
      toolbar.setActiveLevels(new Set(['Error']));
      toolbar.setActiveLevels(new Set());
      const buttons = container.querySelectorAll('.level-btn');
      for (const btn of buttons) {
        expect(btn.classList.contains('active')).toBe(false);
      }
    });
  });

  describe('view toggle', () => {
    it('calls onViewModeChange with "raw" when toggled from table', () => {
      const btn = container.querySelector<HTMLButtonElement>('.view-toggle')!;
      btn.click();
      expect(events.onViewModeChange).toHaveBeenCalledWith('raw');
    });

    it('calls onViewModeChange with "table" when toggled back', () => {
      const btn = container.querySelector<HTMLButtonElement>('.view-toggle')!;
      btn.click(); // table → raw
      btn.click(); // raw → table
      expect(events.onViewModeChange).toHaveBeenNthCalledWith(2, 'table');
    });
  });
});
