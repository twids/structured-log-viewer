import { LogTemplate } from './types';

export const serilogCompactTemplate: LogTemplate = {
  name: 'Serilog Compact (CLEF)',
  detect: ['@t'],
  mappings: {
    timestamp: '@t',
    level: '@l',
    message: '@m',
    messageTemplate: '@mt',
    exception: '@x',
    eventId: '@i',
  },
  defaultLevel: 'Information',
};
