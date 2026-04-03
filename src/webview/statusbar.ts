export interface StatusBarOptions {
  shownCount: number;
  totalCount: number;
  loadedCount: number;
  templateName: string;
  isLive: boolean;
  isLoading: boolean;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export class StatusBar {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  update(opts: StatusBarOptions): void {
    this.container.innerHTML = '';

    const countSpan = document.createElement('span');
    countSpan.textContent = `Showing ${formatNumber(opts.shownCount)} of ${formatNumber(opts.totalCount)} entries`;
    this.container.appendChild(countSpan);

    if (opts.templateName) {
      const sep = document.createElement('span');
      sep.textContent = ' | ';
      this.container.appendChild(sep);

      const tmplSpan = document.createElement('span');
      tmplSpan.textContent = opts.templateName;
      this.container.appendChild(tmplSpan);
    }

    if (opts.isLive) {
      const sep = document.createElement('span');
      sep.textContent = ' | ';
      this.container.appendChild(sep);

      const liveSpan = document.createElement('span');
      liveSpan.className = 'status-live';
      liveSpan.textContent = '\u{1F7E2} Live';
      this.container.appendChild(liveSpan);
    }

    if (opts.isLoading) {
      const sep = document.createElement('span');
      sep.textContent = ' | ';
      this.container.appendChild(sep);

      const loadingSpan = document.createElement('span');
      loadingSpan.className = 'status-loading';
      loadingSpan.textContent = 'Loading\u2026';
      this.container.appendChild(loadingSpan);
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
