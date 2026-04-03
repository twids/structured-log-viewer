import * as vscode from 'vscode';
import { LogDocument } from './logDocument';
import { getAllTemplates } from './templates/registry';
import { LogTemplate } from './templates/types';
import {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './messages';

export class LogEditorProvider
  implements vscode.CustomReadonlyEditorProvider<LogDocument>
{
  static readonly viewType = 'structuredLogViewer.logTable';

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<LogDocument> {
    const userTemplates = this.getUserTemplates();
    return LogDocument.create(uri, userTemplates);
  }

  resolveCustomEditor(
    document: LogDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    webviewPanel.webview.options = { enableScripts: true };

    const nonce = this.getNonce();
    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      nonce
    );

    const pageSize = this.getPageSize();
    const allTemplates = getAllTemplates(this.getUserTemplates());

    this.postMessage(webviewPanel.webview, {
      type: 'templateList',
      templates: allTemplates.map((t) => ({ name: t.name })),
      activeTemplate: document.template.name,
    });

    this.postMessage(webviewPanel.webview, {
      type: 'loadData',
      entries: document.getPage(0, pageSize),
      totalCount: document.entries.length,
      page: 0,
      pageSize,
    });

    webviewPanel.webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => {
        switch (msg.type) {
          case 'requestPage':
            this.postMessage(webviewPanel.webview, {
              type: 'loadData',
              entries: document.getPage(msg.page, pageSize),
              totalCount: document.entries.length,
              page: msg.page,
              pageSize,
            });
            break;

          case 'changeTemplate': {
            const templates = getAllTemplates(this.getUserTemplates());
            const newTemplate = templates.find(
              (t) => t.name === msg.templateName
            );
            if (newTemplate) {
              document.reparse(newTemplate);
              this.postMessage(webviewPanel.webview, {
                type: 'loadData',
                entries: document.getPage(0, pageSize),
                totalCount: document.entries.length,
                page: 0,
                pageSize,
              });
            }
            break;
          }

          case 'toggleRawView':
            // Handled in webview — no-op on extension side
            break;
        }
      }
    );
  }

  private postMessage(
    webview: vscode.Webview,
    message: ExtensionToWebviewMessage
  ): void {
    webview.postMessage(message);
  }

  private getWebviewContent(
    webview: vscode.Webview,
    _document: LogDocument,
    nonce: string
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.css')
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Structured Log Viewer</title>
</head>
<body>
  <div id="toolbar"></div>
  <div id="table-container"></div>
  <div id="status-bar"></div>
  <div id="raw-view" style="display:none;"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = new Uint8Array(32);
    crypto.getRandomValues(values);
    return Array.from(values, (v) => possible[v % possible.length]).join('');
  }

  private getUserTemplates(): LogTemplate[] | undefined {
    const config = vscode.workspace.getConfiguration('structuredLogViewer');
    const templates = config.get<LogTemplate[]>('customTemplates');
    return templates && templates.length > 0 ? templates : undefined;
  }

  private getPageSize(): number {
    const config = vscode.workspace.getConfiguration('structuredLogViewer');
    return config.get<number>('defaultPageSize') ?? 5000;
  }
}
