import * as vscode from 'vscode';
import { LogEditorProvider } from './logEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LogEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      LogEditorProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'structuredLogViewer.openAsLogTable',
      async () => {
        const uri = vscode.window.activeTextEditor?.document.uri;
        if (uri) {
          await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            LogEditorProvider.viewType
          );
        }
      }
    )
  );
}

export function deactivate(): void {
  // cleanup
}
