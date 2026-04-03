import { LogEntry } from '../templates/types';

export class RawView {
  private container: HTMLElement;
  private pre: HTMLPreElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.pre = document.createElement('pre');
    this.pre.style.margin = '0';
    this.container.appendChild(this.pre);
  }

  setContent(entries: LogEntry[]): void {
    this.pre.textContent = entries
      .map((e) => JSON.stringify(e.raw))
      .join('\n');
  }

  show(): void {
    this.container.classList.add('visible');
  }

  hide(): void {
    this.container.classList.remove('visible');
  }

  destroy(): void {
    if (this.pre.parentNode === this.container) {
      this.container.removeChild(this.pre);
    }
  }
}
