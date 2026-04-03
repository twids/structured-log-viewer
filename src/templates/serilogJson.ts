import { LogTemplate } from './types';

export const serilogJsonTemplate: LogTemplate = {
  name: 'Serilog JSON',
  detect: ['Timestamp', 'Level'],
  mappings: {
    timestamp: 'Timestamp',
    level: 'Level',
    message: 'RenderedMessage',
    messageTemplate: 'MessageTemplate',
    exception: 'Exception',
    properties: 'Properties',
  },
};
