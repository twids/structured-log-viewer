import './styles.css';
import { ViewerState } from './state';
import { VirtualTable } from './table';
import { Toolbar } from './toolbar';
import { RawView } from './rawView';
import { FilterEngine } from './filters';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();

const state = new ViewerState();

let table: VirtualTable | null = null;
let toolbar: Toolbar | null = null;
let rawView: RawView | null = null;

function init(): void {
  const tableContainer = document.getElementById('table-container');
  const toolbarContainer = document.getElementById('toolbar');
  const rawViewContainer = document.getElementById('raw-view');

  if (tableContainer) {
    table = new VirtualTable(tableContainer);
  }

  if (toolbarContainer) {
    toolbar = new Toolbar(toolbarContainer, {
      onLevelToggle: (levels) => {
        state.setActiveLevels(levels);
      },
      onSearch: (text) => {
        state.setSearchText(text);
      },
      onTemplateChange: (templateName) => {
        vscode.postMessage({ type: 'changeTemplate', templateName });
      },
      onViewModeChange: (mode) => {
        state.setViewMode(mode);
      },
    });
  }

  if (rawViewContainer) {
    rawView = new RawView(rawViewContainer);
  }
}

window.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  switch (message.type) {
    case 'loadData':
      state.setEntries(message.entries, message.totalCount, message.page, message.pageSize);
      break;
    case 'templateList': {
      const names = message.templates.map((t: { name: string }) => t.name);
      state.setTemplates(names, message.activeTemplate);
      toolbar?.setTemplates(names, message.activeTemplate);
      break;
    }
    case 'appendData':
      state.appendEntries(message.entries, message.totalCount);
      break;
  }
});

state.onChange((data) => {
  const filtered = FilterEngine.apply(data.entries, data.activeLevels, data.searchText);

  if (data.viewMode === 'table') {
    const tableContainer = document.getElementById('table-container');
    const rawViewContainer = document.getElementById('raw-view');
    if (tableContainer) tableContainer.style.display = '';
    if (rawViewContainer) rawView?.hide();
    if (table) table.setData(filtered);
  } else {
    const tableContainer = document.getElementById('table-container');
    if (tableContainer) tableContainer.style.display = 'none';
    rawView?.setContent(filtered);
    rawView?.show();
  }

  toolbar?.setActiveLevels(data.activeLevels);
  updateStatusBar(filtered.length, data.totalCount, data.activeTemplateName);
});

vscode.postMessage({ type: 'requestPage', page: 0 });

function updateStatusBar(shown: number, total: number, templateName: string): void {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.textContent = `${shown} of ${total} entries${templateName ? ` · ${templateName}` : ''}`;
}
