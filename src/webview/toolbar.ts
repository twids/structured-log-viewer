import { PropertyFilter, PropertyFilterMode } from './filters';

export interface ToolbarEvents {
  onLevelToggle: (levels: Set<string>) => void;
  onSearch: (text: string) => void;
  onTemplateChange: (templateName: string) => void;
  onViewModeChange: (mode: 'table' | 'raw') => void;
  onPropertyFilterModeChange: (mode: PropertyFilterMode) => void;
  onRemovePropertyFilter: (index: number) => void;
  onClearPropertyFilters: () => void;
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
  private filterRow!: HTMLDivElement;
  private filterModeToggle!: HTMLButtonElement;
  private clearFiltersBtn!: HTMLButtonElement;
  private filterPills!: HTMLDivElement;
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

    this.filterRow = document.createElement('div');
    this.filterRow.className = 'property-filter-row';

    this.filterModeToggle = document.createElement('button');
    this.filterModeToggle.type = 'button';
    this.filterModeToggle.className = 'property-filter-mode';
    this.filterModeToggle.textContent = 'Mode: AND';
    this.filterModeToggle.addEventListener('click', () => {
      const nextMode: PropertyFilterMode =
        this.filterModeToggle.dataset.mode === 'and' ? 'or' : 'and';
      this.events.onPropertyFilterModeChange(nextMode);
    });
    this.filterModeToggle.dataset.mode = 'and';

    this.clearFiltersBtn = document.createElement('button');
    this.clearFiltersBtn.type = 'button';
    this.clearFiltersBtn.className = 'property-filter-clear';
    this.clearFiltersBtn.textContent = 'Clear';
    this.clearFiltersBtn.addEventListener('click', () => {
      this.events.onClearPropertyFilters();
    });

    this.filterPills = document.createElement('div');
    this.filterPills.className = 'property-filter-pills';

    this.filterRow.appendChild(this.filterModeToggle);
    this.filterRow.appendChild(this.clearFiltersBtn);
    this.filterRow.appendChild(this.filterPills);
    this.filterRow.style.display = 'none';
    this.clearFiltersBtn.disabled = true;
    this.container.appendChild(this.filterRow);
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

  setPropertyFilters(
    filters: PropertyFilter[],
    mode: PropertyFilterMode,
  ): void {
    this.filterModeToggle.dataset.mode = mode;
    this.filterModeToggle.textContent = `Mode: ${mode.toUpperCase()}`;
    this.filterPills.innerHTML = '';

    if (filters.length === 0) {
      this.filterRow.style.display = 'none';
      this.clearFiltersBtn.disabled = true;
      return;
    }

    this.filterRow.style.display = '';
    this.clearFiltersBtn.disabled = false;

    filters.forEach((filter, index) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'property-filter-pill';
      pill.title = `Remove filter ${filter.path}=${filter.value}`;
      pill.textContent = `${filter.path}=${filter.value} ×`;
      pill.addEventListener('click', () => {
        this.events.onRemovePropertyFilter(index);
      });
      this.filterPills.appendChild(pill);
    });
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
