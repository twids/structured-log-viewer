import { LogEntry } from '../templates/types';
import { ColumnDef, getDefaultColumns } from './columns';
import { escapeHtml } from './formatters';

export class VirtualTable {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private spacer: HTMLElement;
  private rowContainer: HTMLElement;
  private headerRow: HTMLElement;

  private entries: LogEntry[] = [];
  private columns: ColumnDef[];
  private rowHeight = 28;
  private expansionPanelHeight = 200;
  private expandedRows: Set<number> = new Set();
  private overscan = 5;
  private selectedIndex = -1;

  private rafId: number | null = null;
  private onScrollBound: () => void;
  private onClickBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, columns?: ColumnDef[]) {
    this.container = container;
    this.columns = columns ?? getDefaultColumns();
    this.viewport = container;

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
    container.style.setProperty(
      '--log-columns',
      this.columns.map((c) => c.width).join(' '),
    );

    this.renderHeader();

    this.onScrollBound = () => {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.render();
      });
    };

    this.onClickBound = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
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
    this.headerRow.innerHTML = this.columns
      .map(
        (col) =>
          `<div class="log-cell log-header-cell ${col.className ?? ''}">${escapeHtml(col.label)}</div>`,
      )
      .join('');
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

    const hasExpandable =
      !!(entry.exception ||
        (entry.properties && Object.keys(entry.properties).length > 0));
    if (hasExpandable) {
      row.classList.add('expandable');
    }
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

    if (entry.exception) {
      const pre = document.createElement('pre');
      pre.className = 'exception-text';
      pre.textContent = entry.exception;
      panel.appendChild(pre);
    }

    if (entry.properties && Object.keys(entry.properties).length > 0) {
      const pre = document.createElement('pre');
      pre.className = 'properties-detail';
      pre.textContent = JSON.stringify(entry.properties, null, 2);
      panel.appendChild(pre);
    }

    return panel;
  }
}
