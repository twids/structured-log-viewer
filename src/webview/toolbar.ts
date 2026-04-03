export interface ToolbarEvents {
  onLevelToggle: (levels: Set<string>) => void;
  onSearch: (text: string) => void;
  onTemplateChange: (templateName: string) => void;
  onViewModeChange: (mode: 'table' | 'raw') => void;
}

const LEVEL_COLORS: Record<string, string> = {
  Verbose: '#888888',
  Debug: '#00bcd4',
  Information: '#3794ff',
  Warning: '#fc0',
  Error: '#f44747',
  Fatal: '#ff6b6b',
};

export class Toolbar {
  private container: HTMLElement;
  private levelButtons: Map<string, HTMLElement> = new Map();
  private searchInput!: HTMLInputElement;
  private templateSelect!: HTMLSelectElement;
  private viewToggle!: HTMLButtonElement;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private events: ToolbarEvents;
  private activeLevels: Set<string> = new Set();
  private currentViewMode: 'table' | 'raw' = 'table';

  private static readonly LEVELS = [
    'Verbose',
    'Debug',
    'Information',
    'Warning',
    'Error',
    'Fatal',
  ];

  constructor(container: HTMLElement, events: ToolbarEvents) {
    this.container = container;
    this.events = events;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Level filter buttons
    const levelGroup = document.createElement('div');
    levelGroup.className = 'level-btn-group';

    for (const level of Toolbar.LEVELS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-btn level-btn-${level.toLowerCase()}`;
      btn.textContent = level;
      btn.title = `Filter: ${level}`;
      btn.style.setProperty('--level-color', LEVEL_COLORS[level] ?? '#888');

      btn.addEventListener('click', (e: MouseEvent) => {
        this.handleLevelClick(level, e.shiftKey);
      });

      this.levelButtons.set(level, btn);
      levelGroup.appendChild(btn);
    }

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-input';
    this.searchInput.placeholder = 'Search logs...';
    this.searchInput.setAttribute('aria-label', 'Search log entries');

    this.searchInput.addEventListener('input', () => {
      if (this.searchDebounceTimer !== null) {
        clearTimeout(this.searchDebounceTimer);
      }
      const value = this.searchInput.value;
      this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = null;
        this.events.onSearch(value);
      }, 200);
    });

    // Template selector
    this.templateSelect = document.createElement('select');
    this.templateSelect.className = 'template-select';
    this.templateSelect.setAttribute('aria-label', 'Log format template');

    this.templateSelect.addEventListener('change', () => {
      this.events.onTemplateChange(this.templateSelect.value);
    });

    // View toggle button
    this.viewToggle = document.createElement('button');
    this.viewToggle.type = 'button';
    this.viewToggle.className = 'view-toggle';
    this.viewToggle.setAttribute('aria-label', 'Toggle view mode');
    this.updateViewToggleLabel();

    this.viewToggle.addEventListener('click', () => {
      this.currentViewMode = this.currentViewMode === 'table' ? 'raw' : 'table';
      this.updateViewToggleLabel();
      this.events.onViewModeChange(this.currentViewMode);
    });

    this.container.appendChild(levelGroup);
    this.container.appendChild(this.searchInput);
    this.container.appendChild(this.templateSelect);
    this.container.appendChild(this.viewToggle);
  }

  private handleLevelClick(level: string, shiftKey: boolean): void {
    if (shiftKey) {
      // Additive toggle
      const next = new Set(this.activeLevels);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      this.activeLevels = next;
    } else {
      if (this.activeLevels.size === 1 && this.activeLevels.has(level)) {
        // Clicking the only active level deactivates it (show all)
        this.activeLevels = new Set();
      } else {
        // Activate only this level
        this.activeLevels = new Set([level]);
      }
    }
    this.updateButtonStates();
    this.events.onLevelToggle(new Set(this.activeLevels));
  }

  private updateButtonStates(): void {
    for (const [level, btn] of this.levelButtons) {
      btn.classList.toggle('active', this.activeLevels.has(level));
    }
  }

  private updateViewToggleLabel(): void {
    this.viewToggle.textContent =
      this.currentViewMode === 'table' ? '📋 Table' : '{ } Raw';
  }

  setTemplates(names: string[], active: string): void {
    this.templateSelect.innerHTML = '';
    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      this.templateSelect.appendChild(option);
    }
    this.templateSelect.value = active;
  }

  setActiveLevels(levels: Set<string>): void {
    this.activeLevels = new Set(levels);
    this.updateButtonStates();
  }

  destroy(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.container.innerHTML = '';
    this.levelButtons.clear();
  }
}
