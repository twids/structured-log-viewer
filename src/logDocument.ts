import * as vscode from 'vscode';
import { LogEntry, LogTemplate } from './templates/types';
import { detectTemplate } from './templates/registry';
import { parseLogLine, parseLogLines } from './parser';

const GENERIC_JSON_TEMPLATE: LogTemplate = {
  name: 'Generic JSON',
  mappings: {
    timestamp: '',
    level: '',
    message: '',
  },
};

export class LogDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  entries: LogEntry[];
  template: LogTemplate;
  rawText: string;
  byteLength: number;

  private constructor(
    uri: vscode.Uri,
    rawText: string,
    template: LogTemplate,
    entries: LogEntry[]
  ) {
    this.uri = uri;
    this.rawText = rawText;
    this.template = template;
    this.entries = entries;
    this.byteLength = new TextEncoder().encode(rawText).byteLength;
  }

  static async create(
    uri: vscode.Uri,
    userTemplates?: LogTemplate[]
  ): Promise<LogDocument> {
    const data = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf-8').decode(data);
    return LogDocument.fromText(uri.toString(), text, userTemplates, uri);
  }

  static fromText(
    uriString: string,
    text: string,
    userTemplates?: LogTemplate[],
    uri?: vscode.Uri
  ): LogDocument {
    const resolvedUri = uri ?? vscode.Uri.parse(uriString);
    const sampleLines = text.split('\n').filter((l) => l.trim() !== '').slice(0, 10);
    const detected = detectTemplate(sampleLines, userTemplates);
    const template = detected ?? GENERIC_JSON_TEMPLATE;
    const entries = text.trim() === '' ? [] : parseLogLines(text, template);
    return new LogDocument(resolvedUri, text, template, entries);
  }

  getPage(page: number, pageSize: number): LogEntry[] {
    if (page < 0) {
      return [];
    }
    const start = page * pageSize;
    return this.entries.slice(start, start + pageSize);
  }

  reparse(template: LogTemplate): void {
    this.template = template;
    this.entries = this.rawText.trim() === '' ? [] : parseLogLines(this.rawText, template);
  }

  getTotalPages(pageSize: number): number {
    if (this.entries.length === 0) {
      return 0;
    }
    return Math.ceil(this.entries.length / pageSize);
  }

  appendText(newText: string): LogEntry[] {
    if (newText.trim() === '') {
      return [];
    }
    const startLine = this.entries.length > 0
      ? this.entries[this.entries.length - 1].line + 1
      : 0;
    const lines = newText.split('\n');
    const newEntries: LogEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        continue;
      }
      newEntries.push(parseLogLine(lines[i], startLine + i, this.template));
    }
    this.entries.push(...newEntries);
    this.rawText += (this.rawText.endsWith('\n') || this.rawText === '' ? '' : '\n') + newText;
    this.byteLength = new TextEncoder().encode(this.rawText).byteLength;
    return newEntries;
  }

  dispose(): void {
    this.entries = [];
  }
}
