import './styles.css';
import { ViewerState, ViewerStateData } from './state';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();

const state = new ViewerState();

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  switch (message.type) {
    case 'loadData':
      state.setEntries(message.entries, message.totalCount, message.page, message.pageSize);
      break;
    case 'templateList':
      state.setTemplates(
        message.templates.map((t: { name: string }) => t.name),
        message.activeTemplate
      );
      break;
    case 'appendData':
      state.appendEntries(message.entries, message.totalCount);
      break;
  }
});

state.onChange((data) => {
  renderPlaceholder(data);
});

vscode.postMessage({ type: 'requestPage', page: 0 });

function renderPlaceholder(data: ViewerStateData): void {
  const container = document.getElementById('table-container');
  if (!container) return;
  container.textContent = `Loaded ${data.entries.length} of ${data.totalCount} entries (${data.activeTemplateName} format)`;
}
