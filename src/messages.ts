import { LogEntry } from './templates/types';

// Extension → Webview messages
export interface LoadDataMessage {
  type: 'loadData';
  entries: LogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TemplateListMessage {
  type: 'templateList';
  templates: { name: string }[];
  activeTemplate: string;
}

export interface AppendDataMessage {
  type: 'appendData';
  entries: LogEntry[];
  totalCount: number;
}

// Webview → Extension messages
export interface RequestPageMessage {
  type: 'requestPage';
  page: number;
}

export interface ChangeTemplateMessage {
  type: 'changeTemplate';
  templateName: string;
}

export interface ToggleRawViewMessage {
  type: 'toggleRawView';
}

// Union types
export type ExtensionToWebviewMessage =
  | LoadDataMessage
  | TemplateListMessage
  | AppendDataMessage;

export type WebviewToExtensionMessage =
  | RequestPageMessage
  | ChangeTemplateMessage
  | ToggleRawViewMessage;
