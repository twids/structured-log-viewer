export const Uri = {
  parse(value: string) {
    return { toString: () => value, fsPath: value, scheme: 'file', path: value };
  },
  file(path: string) {
    return { toString: () => `file://${path}`, fsPath: path, scheme: 'file', path };
  },
};

export const workspace = {
  fs: {
    readFile: async () => new Uint8Array(),
  },
  getConfiguration: () => ({
    get: () => undefined,
  }),
};

export const window = {
  activeTextEditor: undefined,
  registerCustomEditorProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export const EventEmitter = class {
  event = () => {};
  fire() {}
  dispose() {}
};
