import { describe, it, expect } from 'vitest';
import type {
  LoadDataMessage,
  TemplateListMessage,
  AppendDataMessage,
  RequestPageMessage,
  ChangeTemplateMessage,
  ToggleRawViewMessage,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../messages';

describe('Message Types', () => {
  it('LoadDataMessage has correct shape', () => {
    const msg: LoadDataMessage = {
      type: 'loadData',
      entries: [],
      totalCount: 0,
      page: 0,
      pageSize: 100,
    };
    expect(msg.type).toBe('loadData');
    expect(msg.entries).toEqual([]);
    expect(msg.totalCount).toBe(0);
    expect(msg.page).toBe(0);
    expect(msg.pageSize).toBe(100);
  });

  it('TemplateListMessage has correct shape', () => {
    const msg: TemplateListMessage = {
      type: 'templateList',
      templates: [{ name: 'CLEF' }, { name: 'Serilog JSON' }],
      activeTemplate: 'CLEF',
    };
    expect(msg.type).toBe('templateList');
    expect(msg.templates).toHaveLength(2);
    expect(msg.activeTemplate).toBe('CLEF');
  });

  it('AppendDataMessage has correct shape', () => {
    const msg: AppendDataMessage = {
      type: 'appendData',
      entries: [],
      totalCount: 10,
    };
    expect(msg.type).toBe('appendData');
    expect(msg.entries).toEqual([]);
    expect(msg.totalCount).toBe(10);
  });

  it('RequestPageMessage has correct shape', () => {
    const msg: RequestPageMessage = {
      type: 'requestPage',
      page: 3,
    };
    expect(msg.type).toBe('requestPage');
    expect(msg.page).toBe(3);
  });

  it('ChangeTemplateMessage has correct shape', () => {
    const msg: ChangeTemplateMessage = {
      type: 'changeTemplate',
      templateName: 'Serilog JSON',
    };
    expect(msg.type).toBe('changeTemplate');
    expect(msg.templateName).toBe('Serilog JSON');
  });

  it('ToggleRawViewMessage has correct shape', () => {
    const msg: ToggleRawViewMessage = {
      type: 'toggleRawView',
    };
    expect(msg.type).toBe('toggleRawView');
  });

  it('ExtensionToWebviewMessage union accepts all extension messages', () => {
    const messages: ExtensionToWebviewMessage[] = [
      { type: 'loadData', entries: [], totalCount: 0, page: 0, pageSize: 100 },
      { type: 'templateList', templates: [], activeTemplate: '' },
      { type: 'appendData', entries: [], totalCount: 0 },
    ];
    expect(messages).toHaveLength(3);
  });

  it('WebviewToExtensionMessage union accepts all webview messages', () => {
    const messages: WebviewToExtensionMessage[] = [
      { type: 'requestPage', page: 0 },
      { type: 'changeTemplate', templateName: 'test' },
      { type: 'toggleRawView' },
    ];
    expect(messages).toHaveLength(3);
  });
});
