import { LogEntry } from '../templates/types';
import { PropertyFilter, PropertyFilterMode } from './filters';

export type ViewMode = 'table' | 'raw';

export interface ViewerStateData {
  entries: LogEntry[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  loadedPages: Set<number>;
  isLoading: boolean;
  isLive: boolean;
  activeTemplateName: string;
  templateNames: string[];
  viewMode: ViewMode;
  activeLevels: Set<string>;
  searchText: string;
  propertyFilters: PropertyFilter[];
  propertyFilterMode: PropertyFilterMode;
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
      hasMore: false,
      loadedPages: new Set(),
      isLoading: false,
      isLive: false,
      activeTemplateName: '',
      templateNames: [],
      viewMode: 'table',
      activeLevels: new Set(),
      searchText: '',
      propertyFilters: [],
      propertyFilterMode: 'and',
    };
  }

  get(): ViewerStateData {
    return this.data;
  }

  setEntries(entries: LogEntry[], totalCount: number, page: number, pageSize: number, hasMore?: boolean): void {
    const loadedPages = page === 0 ? new Set([0]) : new Set([...this.data.loadedPages, page]);
    const newEntries = page === 0 ? entries : [...this.data.entries, ...entries];
    this.data = {
      ...this.data,
      entries: newEntries,
      totalCount,
      currentPage: page,
      pageSize,
      hasMore: hasMore ?? false,
      loadedPages,
      isLoading: false,
    };
    this.notify();
  }

  appendEntries(entries: LogEntry[], totalCount: number): void {
    this.data = { ...this.data, entries: [...this.data.entries, ...entries], totalCount, isLive: true };
    this.notify();
  }

  setLoading(isLoading: boolean): void {
    this.data = { ...this.data, isLoading };
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

  addPropertyFilter(filter: PropertyFilter): void {
    const exists = this.data.propertyFilters.some(
      (f) => f.path === filter.path && f.value === filter.value,
    );
    if (exists) return;
    this.data = {
      ...this.data,
      propertyFilters: [...this.data.propertyFilters, filter],
    };
    this.notify();
  }

  removePropertyFilter(index: number): void {
    if (index < 0 || index >= this.data.propertyFilters.length) return;
    this.data = {
      ...this.data,
      propertyFilters: this.data.propertyFilters.filter((_, i) => i !== index),
    };
    this.notify();
  }

  clearPropertyFilters(): void {
    if (this.data.propertyFilters.length === 0) return;
    this.data = {
      ...this.data,
      propertyFilters: [],
    };
    this.notify();
  }

  setPropertyFilterMode(mode: PropertyFilterMode): void {
    this.data = { ...this.data, propertyFilterMode: mode };
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
