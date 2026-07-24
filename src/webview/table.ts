import { LogEntry } from '../templates/types';
import { ColumnDef, getDefaultColumns } from './columns';
import { PropertyFilter } from './filters';

export interface VirtualTableEvents {
  onPropertyFilterAdd?: (filter: PropertyFilter) => void;
}

export class VirtualTable {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private spacer: HTMLElement;
  private rowContainer: HTMLElement;
  private headerRow: HTMLElement;

  private entries: LogEntry[] = [];
  private columns: ColumnDef[];
  private rowHeight = 28;
  private expansionPanelHeight = 260;
  private expandedRows: Set<number> = new Set();
  private overscan = 5;
  private selectedIndex = -1;

  private rafId: number | null = null;
  private isResizingColumn = false;
  private columnWidths: string[];
  private onScrollBound: () => void;
  private onClickBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private events?: VirtualTableEvents;

  constructor(
    container: HTMLElement,
    columns?: ColumnDef[],
    events?: VirtualTableEvents,
  ) {
    this.container = container;
    this.columns = columns ?? getDefaultColumns();
    this.columnWidths = this.columns.map((c) => c.width);
    this.viewport = container;
    this.events = events;

    // Build DOM structure
    this.headerRow = document.createElement('div');
    this.headerRow.className = 'log-table-header';

    this.rowContainer = document.createElement('div');
    this.rowContainer.className = 'log-table-body';
    this.spacer = this.rowContainer;

    container.appendChild(this.headerRow);
    container.appendChild(this.rowContainer);

    // Make viewport focusable for keyboard navigation
    container.setAttribute('tabindex', '0');

    // Set CSS variable for column widths (inherited by all .log-row children)
    this.applyColumnWidths();

    this.renderHeader();

    this.onScrollBound = () => {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.render();
      });
    };

    this.onClickBound = (e: MouseEvent) => {
      if (this.isResizingColumn) {
        return;
      }
      const target = e.target as HTMLElement;
      const filterAction = target.closest(
        '.property-filter-action',
      ) as HTMLElement | null;
      if (filterAction) {
        const path = filterAction.dataset.filterPath;
        const value = filterAction.dataset.filterValue;
        if (path && value !== undefined) {
          this.events?.onPropertyFilterAdd?.({ path, value });
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const row = target.closest('.log-row') as HTMLElement | null;
      if (row) {
        const index = parseInt(row.dataset.index ?? '', 10);
        if (!isNaN(index)) {
          this.selectRow(index);
          if (row.classList.contains('expandable')) {
            this.toggleExpand(index);
          }
        }
      }
    };

    this.onKeyDownBound = (e: KeyboardEvent) => {
      if (this.entries.length === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectRow(Math.min(this.selectedIndex + 1, this.entries.length - 1));
          this.scrollToSelected();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectRow(Math.max(this.selectedIndex - 1, 0));
          this.scrollToSelected();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0) {
            this.toggleExpand(this.selectedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (this.selectedIndex >= 0 && this.expandedRows.has(this.selectedIndex)) {
            this.toggleExpand(this.selectedIndex);
          }
          break;
      }
    };

    this.viewport.addEventListener('scroll', this.onScrollBound);
    this.viewport.addEventListener('click', this.onClickBound);
    this.viewport.addEventListener('keydown', this.onKeyDownBound);

    this.render();
  }

  setData(entries: LogEntry[]): void {
    this.entries = entries;
    this.expandedRows.clear();
    this.selectedIndex = -1;
    this.updateSpacer();
    this.render();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  selectRow(index: number): void {
    if (index < -1 || index >= this.entries.length) return;
    this.selectedIndex = index;
    this.render();
  }

  private scrollToSelected(): void {
    if (this.selectedIndex < 0) return;
    const rowTop = this.getRowTop(this.selectedIndex);
    const rowBottom = rowTop + this.rowHeight;
    const viewTop = this.viewport.scrollTop;
    const viewBottom = viewTop + this.viewport.clientHeight;

    if (rowTop < viewTop) {
      this.viewport.scrollTop = rowTop;
    } else if (rowBottom > viewBottom) {
      this.viewport.scrollTop = rowBottom - this.viewport.clientHeight;
    }
  }

  toggleExpand(index: number): void {
    if (this.expandedRows.has(index)) {
      this.expandedRows.delete(index);
    } else {
      this.expandedRows.add(index);
    }
    this.updateSpacer();
    this.render();
  }

  getVisibleRange(): { start: number; end: number } {
    return this.calculateVisibleRange();
  }

  destroy(): void {
    this.viewport.removeEventListener('scroll', this.onScrollBound);
    this.viewport.removeEventListener('click', this.onClickBound);
    this.viewport.removeEventListener('keydown', this.onKeyDownBound);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.headerRow.parentNode === this.container) {
      this.container.removeChild(this.headerRow);
    }
    if (this.rowContainer.parentNode === this.container) {
      this.container.removeChild(this.rowContainer);
    }
  }

  private renderHeader(): void {
    this.headerRow.innerHTML = '';
    this.columns.forEach((col, index) => {
      const cell = document.createElement('div');
      cell.className = `log-cell log-header-cell ${col.className ?? ''}`.trim();
      cell.textContent = col.label;

      if (index < this.columns.length - 1) {
        const handle = document.createElement('div');
        handle.className = 'col-resize-handle';
        handle.addEventListener('mousedown', (event) =>
          this.startColumnResize(event, index),
        );
        cell.appendChild(handle);
      }

      this.headerRow.appendChild(cell);
    });
  }

  private applyColumnWidths(): void {
    this.container.style.setProperty('--log-columns', this.columnWidths.join(' '));
  }

  private startColumnResize(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    this.isResizingColumn = true;

    const headerCells = Array.from(
      this.headerRow.querySelectorAll('.log-header-cell'),
    ) as HTMLElement[];

    const measuredWidths = headerCells.map((cell, index) => {
      const measured =
        cell.getBoundingClientRect().width ||
        cell.offsetWidth ||
        this.getFallbackWidth(index);
      return Math.max(this.getMinColumnWidth(index), measured);
    });

    this.columnWidths = measuredWidths.map((w) => `${Math.round(w)}px`);
    this.applyColumnWidths();

    const startX = event.clientX;
    const startWidth = measuredWidths[columnIndex];
    const minWidth = this.getMinColumnWidth(columnIndex);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(minWidth, startWidth + delta);
      measuredWidths[columnIndex] = nextWidth;
      this.columnWidths = measuredWidths.map((w) => `${Math.round(w)}px`);
      this.applyColumnWidths();
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.isResizingColumn = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private getMinColumnWidth(index: number): number {
    switch (this.columns[index]?.id) {
      case 'line':
        return 40;
      case 'level':
        return 70;
      default:
        return 80;
    }
  }

  private getFallbackWidth(index: number): number {
    const width = this.columnWidths[index];
    if (width.endsWith('px')) {
      const parsed = Number.parseInt(width, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (width.endsWith('fr')) {
      return 300;
    }
    return 120;
  }

  private updateSpacer(): void {
    const totalHeight =
      this.entries.length * this.rowHeight +
      this.expandedRows.size * this.expansionPanelHeight;
    this.spacer.style.height = `${totalHeight}px`;
    this.spacer.style.position = 'relative';
  }

  private calculateVisibleRange(): { start: number; end: number } {
    if (this.entries.length === 0) return { start: 0, end: 0 };

    const scrollTop = this.viewport.scrollTop;
    const viewportHeight =
      this.viewport.clientHeight || this.viewport.offsetHeight || 400;

    if (this.expandedRows.size === 0) {
      const start = Math.max(
        0,
        Math.floor(scrollTop / this.rowHeight) - this.overscan,
      );
      const end = Math.min(
        this.entries.length - 1,
        start + Math.ceil(viewportHeight / this.rowHeight) + this.overscan * 2,
      );
      return { start, end };
    }

    // With expanded rows: linear scan for the visible range
    let start = 0;
    while (
      start < this.entries.length - 1 &&
      this.getRowTop(start + 1) <= scrollTop
    ) {
      start++;
    }
    start = Math.max(0, start - this.overscan);

    let end = start;
    while (
      end < this.entries.length - 1 &&
      this.getRowTop(end) < scrollTop + viewportHeight
    ) {
      end++;
    }
    end = Math.min(this.entries.length - 1, end + this.overscan);

    return { start, end };
  }

  private getRowTop(index: number): number {
    if (this.expandedRows.size === 0) {
      return index * this.rowHeight;
    }
    let offset = index * this.rowHeight;
    for (const expandedIdx of this.expandedRows) {
      if (expandedIdx < index) {
        offset += this.expansionPanelHeight;
      }
    }
    return offset;
  }

  private render(): void {
    if (this.entries.length === 0) {
      this.rowContainer.innerHTML = '';
      return;
    }

    const { start, end } = this.calculateVisibleRange();

    this.rowContainer.innerHTML = '';

    for (let i = start; i <= end; i++) {
      const entry = this.entries[i];
      const row = this.renderRowElement(entry, i);
      this.rowContainer.appendChild(row);

      if (this.expandedRows.has(i)) {
        const panel = this.renderExpansionPanel(entry, i);
        this.rowContainer.appendChild(panel);
      }
    }
  }

  private renderRowElement(entry: LogEntry, index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = `log-row level-${entry.level.toLowerCase()}`;
    row.dataset.index = String(index);

    row.classList.add('expandable');
    if (this.expandedRows.has(index)) {
      row.classList.add('expanded');
    }
    if (index === this.selectedIndex) {
      row.classList.add('selected');
    }

    const top = this.getRowTop(index);
    row.style.cssText = `position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.rowHeight}px;`;

    let cellsHtml = '';
    for (const col of this.columns) {
      const cls = `log-cell ${col.className ?? ''}`.trim();
      cellsHtml += `<div class="${cls}">${col.render(entry)}</div>`;
    }
    row.innerHTML = cellsHtml;

    return row;
  }

  private renderExpansionPanel(entry: LogEntry, index: number): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'expansion-panel';
    panel.dataset.expandFor = String(index);

    const top = this.getRowTop(index) + this.rowHeight;
    panel.style.cssText = `position: absolute; top: ${top}px; left: 0; right: 0;`;

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'event-summary-grid';
    summaryGrid.appendChild(this.createSummaryItem('Line', String(entry.line + 1)));
    summaryGrid.appendChild(this.createSummaryItem('Timestamp', entry.timestamp || '-'));
    summaryGrid.appendChild(this.createSummaryItem('Level', entry.level || '-'));
    summaryGrid.appendChild(this.createSummaryItem('Message', entry.message || '-'));
    if (entry.messageTemplate) {
      summaryGrid.appendChild(this.createSummaryItem('Template', entry.messageTemplate));
    }
    if (entry.eventId) {
      summaryGrid.appendChild(this.createSummaryItem('Event Id', entry.eventId));
    }
    panel.appendChild(summaryGrid);

    if (entry.exception) {
      panel.appendChild(this.createSection('Exception', entry.exception, 'exception-text'));
    }

    if (entry.properties && Object.keys(entry.properties).length > 0) {
      panel.appendChild(this.createPropertiesSection(entry.properties));
    }

    panel.appendChild(
      this.createSection(
        'Raw JSON',
        JSON.stringify(entry.raw, null, 2),
        'raw-json-detail',
        false,
      ),
    );

    return panel;
  }

  private createSummaryItem(label: string, value: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'event-summary-item';

    const key = document.createElement('span');
    key.className = 'event-summary-key';
    key.textContent = label;

    const text = document.createElement('span');
    text.className = 'event-summary-value';
    text.textContent = value;

    item.appendChild(key);
    item.appendChild(text);
    return item;
  }

  private createSection(
    title: string,
    body: string,
    contentClass: string,
    isOpen = true,
  ): HTMLElement {
    const details = document.createElement('details');
    details.className = 'event-section';
    details.open = isOpen;

    const summary = document.createElement('summary');
    summary.textContent = title;
    details.appendChild(summary);

    const pre = document.createElement('pre');
    pre.className = contentClass;
    pre.textContent = body;
    details.appendChild(pre);

    return details;
  }

  private createPropertiesSection(properties: Record<string, unknown>): HTMLElement {
    const details = document.createElement('details');
    details.className = 'event-section';
    details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = 'Properties';
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'properties-tree';
    body.appendChild(this.renderPropertyObject(properties, 0));
    details.appendChild(body);

    return details;
  }

  private renderPropertyObject(
    obj: Record<string, unknown>,
    depth: number,
    pathPrefix = '',
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'property-group';

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      container.appendChild(this.renderPropertyNode(key, value, depth, fullPath));
    }

    return container;
  }

  private renderPropertyNode(
    key: string,
    value: unknown,
    depth: number,
    fullPath: string,
  ): HTMLElement {
    if (Array.isArray(value)) {
      return this.renderArrayNode(key, value, depth, fullPath);
    }

    if (value !== null && typeof value === 'object') {
      const details = document.createElement('details');
      details.className = 'property-node property-node-group';
      details.open = depth < 1;

      const summary = document.createElement('summary');
      const keySpan = document.createElement('span');
      keySpan.className = 'property-key';
      keySpan.textContent = key;
      const typeSpan = document.createElement('span');
      typeSpan.className = 'property-type';
      typeSpan.textContent = '{object}';
      summary.appendChild(keySpan);
      summary.appendChild(document.createTextNode(' '));
      summary.appendChild(typeSpan);
      details.appendChild(summary);
      details.appendChild(
        this.renderPropertyObject(
          value as Record<string, unknown>,
          depth + 1,
          fullPath,
        ),
      );
      return details;
    }

    const row = document.createElement('div');
    row.className = 'property-node property-leaf';

    const keySpan = document.createElement('span');
    keySpan.className = 'property-key';
    keySpan.textContent = key;
    const sep = document.createElement('span');
    sep.className = 'property-sep';
    sep.textContent = ':';
    const valueSpan = document.createElement('button');
    valueSpan.type = 'button';
    valueSpan.className = 'property-value property-filter-action';
    valueSpan.dataset.filterPath = fullPath;
    valueSpan.dataset.filterValue = this.formatPropertyValue(value);
    valueSpan.title = `Filter by ${fullPath}`;
    valueSpan.textContent = this.formatPropertyValue(value);
    const typeSpan = document.createElement('span');
    typeSpan.className = 'property-type';
    typeSpan.textContent = this.getPropertyType(value);

    row.appendChild(keySpan);
    row.appendChild(sep);
    row.appendChild(valueSpan);
    row.appendChild(typeSpan);
    return row;
  }

  private renderArrayNode(
    key: string,
    values: unknown[],
    depth: number,
    fullPath: string,
  ): HTMLElement {
    const details = document.createElement('details');
    details.className = 'property-node property-node-group';
    details.open = depth < 1;

    const summary = document.createElement('summary');
    const keySpan = document.createElement('span');
    keySpan.className = 'property-key';
    keySpan.textContent = key;
    const typeSpan = document.createElement('span');
    typeSpan.className = 'property-type';
    typeSpan.textContent = `[${values.length}]`;
    summary.appendChild(keySpan);
    summary.appendChild(document.createTextNode(' '));
    summary.appendChild(typeSpan);
    details.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'property-group';

    values.forEach((item, index) => {
      const itemPath = `${fullPath}.${index}`;
      list.appendChild(
        this.renderPropertyNode(`[${index}]`, item, depth + 1, itemPath),
      );
    });

    details.appendChild(list);
    return details;
  }

  private formatPropertyValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }

  private getPropertyType(value: unknown): string {
    if (value === null) return '(null)';
    if (Array.isArray(value)) return '(array)';
    return `(${typeof value})`;
  }
}
