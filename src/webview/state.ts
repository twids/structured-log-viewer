import { LogEntry } from '../templates/types';

export type ViewMode = 'table' | 'raw';

export interface ViewerStateData {
  entries: LogEntry[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  activeTemplateName: string;
  templateNames: string[];
  viewMode: ViewMode;
  activeLevels: Set<string>;
  searchText: string;
}

export class ViewerState {
  private data: ViewerStateData;
  private listeners: Array<(data: ViewerStateData) => void> = [];

  constructor() {
    this.data = {
      entries: [],
      totalCount: 0,
      currentPage: 0,
      pageSize: 100,
      activeTemplateName: '',
      templateNames: [],
      viewMode: 'table',
      activeLevels: new Set(),
      searchText: '',
    };
  }

  get(): ViewerStateData {
    return this.data;
  }

  setEntries(entries: LogEntry[], totalCount: number, page: number, pageSize: number): void {
    this.data = { ...this.data, entries, totalCount, currentPage: page, pageSize };
    this.notify();
  }

  appendEntries(entries: LogEntry[], totalCount: number): void {
    this.data = { ...this.data, entries: [...this.data.entries, ...entries], totalCount };
    this.notify();
  }

  setTemplates(templates: string[], active: string): void {
    this.data = { ...this.data, templateNames: templates, activeTemplateName: active };
    this.notify();
  }

  setViewMode(mode: ViewMode): void {
    this.data = { ...this.data, viewMode: mode };
    this.notify();
  }

  setActiveLevels(levels: Set<string>): void {
    this.data = { ...this.data, activeLevels: levels };
    this.notify();
  }

  setSearchText(text: string): void {
    this.data = { ...this.data, searchText: text };
    this.notify();
  }

  onChange(listener: (data: ViewerStateData) => void): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }
}
