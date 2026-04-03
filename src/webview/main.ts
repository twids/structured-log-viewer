import './styles.css';
import { ViewerState } from './state';
import { VirtualTable } from './table';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();

const state = new ViewerState();

let table: VirtualTable | null = null;

function initTable(): void {
  const container = document.getElementById('table-container');
  if (!container) return;
  table = new VirtualTable(container);
}

window.addEventListener('DOMContentLoaded', initTable);

// If DOM is already ready (webview loads synchronously)
if (document.readyState !== 'loading') {
  initTable();
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  switch (message.type) {
    case 'loadData':
      state.setEntries(message.entries, message.totalCount, message.page, message.pageSize);
      break;
    case 'templateList':
      state.setTemplates(
        message.templates.map((t: { name: string }) => t.name),
        message.activeTemplate,
      );
      break;
    case 'appendData':
      state.appendEntries(message.entries, message.totalCount);
      break;
  }
});

state.onChange((data) => {
  if (table) {
    table.setData(data.entries);
  }
  updateStatusBar(data.entries.length, data.totalCount, data.activeTemplateName);
});

vscode.postMessage({ type: 'requestPage', page: 0 });

function updateStatusBar(loaded: number, total: number, templateName: string): void {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.textContent = `${loaded} of ${total} entries${templateName ? ` · ${templateName}` : ''}`;
}
